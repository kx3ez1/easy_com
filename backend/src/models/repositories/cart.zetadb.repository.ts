import type { ICartRepository, ICheckoutRepository } from './cart.repository.ts';
import type { Cart, CheckoutSnapshot, CartItem } from '../types/cart.types.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';

export class ZetaCartRepository implements ICartRepository {
  private client = new ZetaDBClient();

  private getCartKey(userId: string): string {
    return `cart:${userId}`;
  }

  async getCart(userId: string): Promise<Cart> {
    const res = await this.client.get<{ value: Cart }>(this.getCartKey(userId));
    if (res.status === 'success' && res.data) {
      const cart = res.data.value;
      if (cart.updatedAt) {
        cart.updatedAt = new Date(cart.updatedAt);
      }
      return cart;
    }

    if (res.status === 'error' && res.code === 'KEY_NOT_FOUND') {
      // Initialize fresh cart if none exists
      const freshCart: Cart = {
        user_id: userId,
        cart_version: 0,
        items: [],
        updatedAt: new Date()
      };
      await this.saveCart(freshCart);
      return freshCart;
    }

    throw new Error(`Failed to fetch cart from ZetaDB: ${res.error?.message || res.code}`);
  }

  async saveCart(cart: Cart): Promise<Cart> {
    const cartToSave = {
      ...cart,
      updatedAt: new Date()
    };
    const [res] = await Promise.all([
      this.client.put(this.getCartKey(cart.user_id), cartToSave),
      this.client.put(`cart_history:${cart.user_id}:${cart.cart_version}`, cartToSave)
    ]);
    if (res.status === 'error') {
      throw new Error(`Failed to save cart to ZetaDB: ${res.error?.message}`);
    }
    return cartToSave;
  }

  async clearCartItems(userId: string, itemsToRemove: { sku: string; qty: number }[]): Promise<Cart> {
    const cart = await this.getCart(userId);

    const updatedItems = cart.items.map(item => {
      const match = itemsToRemove.find(r => r.sku === item.sku);
      if (match) {
        return {
          ...item,
          qty: Math.max(0, item.qty - match.qty)
        };
      }
      return item;
    }).filter(item => item.qty > 0);

    cart.items = updatedItems;
    cart.cart_version += 1;

    return this.saveCart(cart);
  }

  async getCartHistory(userId: string): Promise<Cart[]> {
    const baseUrl = process.env.ZETADB_URL || 'http://localhost:8080';
    const queryUrl = `${baseUrl}/query?q=cart_history:${userId}:*&type=wildcard&limit=100`;
    const res = await fetch(queryUrl, {
      headers: {
        'X-API-Key': process.env.ZETADB_API_KEY || '',
      },
    });
    const data = await res.json();
    if (data.status !== 'success' || !data.data?.results) {
      return [];
    }
    return data.data.results.map((r: any) => {
      const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      if (val.updatedAt) {
        val.updatedAt = new Date(val.updatedAt);
      }
      return val as Cart;
    }).sort((a: Cart, b: Cart) => b.cart_version - a.cart_version);
  }

  async getCartVersion(userId: string, version: number): Promise<Cart | null> {
    const res = await this.client.get<{ value: Cart }>(`cart_history:${userId}:${version}`);
    if (res.status === 'success' && res.data) {
      const cart = res.data.value;
      if (cart.updatedAt) {
        cart.updatedAt = new Date(cart.updatedAt);
      }
      return cart;
    }
    return null;
  }
}

export class ZetaCheckoutRepository implements ICheckoutRepository {
  private client = new ZetaDBClient();

  private getCheckoutKey(timestamp: string, checkoutId: string): string {
    return `checkout:${timestamp}:${checkoutId}`;
  }

  private getCheckoutIdMapKey(checkoutId: string): string {
    return `checkout:id:${checkoutId}`;
  }

  async create(checkout: CheckoutSnapshot): Promise<CheckoutSnapshot> {
    if (!checkout.createdAt) {
      checkout.createdAt = new Date();
    }
    const timestamp = checkout.createdAt instanceof Date ? checkout.createdAt.toISOString() : new Date(checkout.createdAt).toISOString();
    const res = await this.client.put(this.getCheckoutKey(timestamp, checkout.checkout_id), checkout);
    if (res.status === 'error') {
      throw new Error(`Failed to create checkout snapshot in ZetaDB: ${res.error?.message}`);
    }
    await this.client.put(this.getCheckoutIdMapKey(checkout.checkout_id), timestamp);
    return checkout;
  }

  async getById(checkoutId: string): Promise<CheckoutSnapshot | null> {
    const mapRes = await this.client.get<string>(this.getCheckoutIdMapKey(checkoutId));
    if (mapRes.status === 'success' && mapRes.data) {
      const timestamp = typeof mapRes.data === 'string' ? mapRes.data : (mapRes.data as any).value;
      if (timestamp) {
        const res = await this.client.get<{ value: CheckoutSnapshot }>(this.getCheckoutKey(timestamp, checkoutId));
        if (res.status === 'success' && res.data) {
          const checkout = res.data.value;
          if (checkout.createdAt) {
            checkout.createdAt = new Date(checkout.createdAt);
          }
          return checkout;
        }
      }
    }
    return null;
  }

  async updateStatus(checkoutId: string, status: "completed" | "expired"): Promise<void> {
    const existing = await this.getById(checkoutId);
    if (!existing) {
      throw new Error(`Checkout snapshot with ID ${checkoutId} not found`);
    }
    existing.status = status;
    const timestamp = existing.createdAt instanceof Date ? existing.createdAt.toISOString() : new Date(existing.createdAt).toISOString();
    const res = await this.client.put(this.getCheckoutKey(timestamp, checkoutId), existing);
    if (res.status === 'error') {
      throw new Error(`Failed to update checkout snapshot status: ${res.error?.message}`);
    }
  }

  async getCheckoutsByDate(datePrefix: string): Promise<CheckoutSnapshot[]> {
    const baseUrl = process.env.ZETADB_URL || 'http://localhost:8080';
    const queryUrl = `${baseUrl}/query?q=checkout:${datePrefix}*&type=wildcard&limit=10000`;
    const res = await fetch(queryUrl, {
      headers: {
        'X-API-Key': process.env.ZETADB_API_KEY || '',
      },
    });
    const data = await res.json();
    if (data.status !== 'success' || !data.data?.results) {
      return [];
    }
    const results = data.data.results.filter(
      (r: any) => r.key && !r.key.startsWith('checkout:id:')
    );
    return results.map((r: any) => {
      const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      if (val.createdAt) {
        val.createdAt = new Date(val.createdAt);
      }
      return val as CheckoutSnapshot;
    });
  }

  async getLiveLockedCheckouts(): Promise<CheckoutSnapshot[]> {
    return this.getAllCheckouts('live');
  }

  async getAllCheckouts(statusFilter: 'live' | 'expired' | 'completed' | 'all' = 'all'): Promise<CheckoutSnapshot[]> {
    const baseUrl = process.env.ZETADB_URL || 'http://localhost:8080';
    const queryUrl = `${baseUrl}/query?q=checkout:*&type=wildcard&limit=10000`;
    const res = await fetch(queryUrl, {
      headers: {
        'X-API-Key': process.env.ZETADB_API_KEY || '',
      },
    });
    const data = await res.json();
    if (data.status !== 'success' || !data.data?.results) {
      return [];
    }
    const results = data.data.results.filter(
      (r: any) => r.key && !r.key.startsWith('checkout:id:')
    );
    const now = new Date();
    const checkouts: CheckoutSnapshot[] = [];

    for (const r of results) {
      const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      if (val.createdAt) {
        val.createdAt = new Date(val.createdAt);
      }
      const checkout = val as CheckoutSnapshot;
      const isExpired = checkout.status === 'expired' || (checkout.status === 'active' && new Date(checkout.expires_at) <= now);
      const isLive = checkout.status === 'active' && new Date(checkout.expires_at) > now;

      if (statusFilter === 'live' && isLive) {
        checkouts.push(checkout);
      } else if (statusFilter === 'expired' && isExpired) {
        checkouts.push(checkout);
      } else if (statusFilter === 'completed' && checkout.status === 'completed') {
        checkouts.push(checkout);
      } else if (statusFilter === 'all') {
        checkouts.push(checkout);
      }
    }

    return checkouts;
  }

  async delete(checkoutId: string): Promise<void> {
    const mapRes = await this.client.get<string>(this.getCheckoutIdMapKey(checkoutId));
    if (mapRes.status === 'success' && mapRes.data) {
      const timestamp = typeof mapRes.data === 'string' ? mapRes.data : (mapRes.data as any).value;
      if (timestamp) {
        await this.client.delete(this.getCheckoutKey(timestamp, checkoutId));
      }
    }
    await this.client.delete(this.getCheckoutIdMapKey(checkoutId));
  }
}
