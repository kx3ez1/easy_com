import type { IOrderRepository, OrderQueryOptions } from './order.repository.ts';
import type { PaginatedResult } from './product.repository.ts';
import type { Order } from '../types/order.types.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';

function parseOrderDates(order: any): Order {
  if (!order) return order;
  const parsed = { ...order };
  if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
  if (parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt);
  if (parsed.approvedAt) parsed.approvedAt = new Date(parsed.approvedAt);
  if (parsed.fulfilledAt) parsed.fulfilledAt = new Date(parsed.fulfilledAt);
  if (parsed.deletedAt) parsed.deletedAt = new Date(parsed.deletedAt);
  
  if (Array.isArray(parsed.payments)) {
    parsed.payments = parsed.payments.map((p: any) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : undefined,
    }));
  }
  if (Array.isArray(parsed.shipments)) {
    parsed.shipments = parsed.shipments.map((s: any) => ({
      ...s,
      createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
      shippedAt: s.shippedAt ? new Date(s.shippedAt) : undefined,
      deliveredAt: s.deliveredAt ? new Date(s.deliveredAt) : undefined,
    }));
  }
  if (Array.isArray(parsed.returns)) {
    parsed.returns = parsed.returns.map((r: any) => ({
      ...r,
      createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
      approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
      receivedAt: r.receivedAt ? new Date(r.receivedAt) : undefined,
      completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
    }));
  }
  if (Array.isArray(parsed.promotions)) {
    parsed.promotions = parsed.promotions.map((pr: any) => ({
      ...pr,
      createdAt: pr.createdAt ? new Date(pr.createdAt) : undefined,
      updatedAt: pr.updatedAt ? new Date(pr.updatedAt) : undefined,
    }));
  }
  if (Array.isArray(parsed.history)) {
    parsed.history = parsed.history.map((h: any) => ({
      ...h,
      createdAt: h.createdAt ? new Date(h.createdAt) : undefined,
    }));
  }
  if (Array.isArray(parsed.allocations)) {
    parsed.allocations = parsed.allocations.map((a: any) => ({
      ...a,
      createdAt: a.createdAt ? new Date(a.createdAt) : undefined,
      updatedAt: a.updatedAt ? new Date(a.updatedAt) : undefined,
      fulfilledAt: a.fulfilledAt ? new Date(a.fulfilledAt) : undefined,
      releasedAt: a.releasedAt ? new Date(a.releasedAt) : undefined,
    }));
  }
  return parsed as Order;
}

export class ZetaOrderRepository implements IOrderRepository {
  private client = new ZetaDBClient();

  private getOrderKey(timestamp: string, id: string): string {
    return `order:${timestamp}:${id}`;
  }

  private getOrderIdMapKey(id: string): string {
    return `order:id:${id}`;
  }

  async getById(id: string): Promise<Order | null> {
    const mapRes = await this.client.get<string>(this.getOrderIdMapKey(id));
    if (mapRes.status === 'success' && mapRes.data) {
      const timestamp = typeof mapRes.data === 'string' ? mapRes.data : (mapRes.data as any).value;
      if (timestamp) {
        const res = await this.client.get<{ value: Order }>(this.getOrderKey(timestamp, id));
        if (res.status === 'success' && res.data) {
          return parseOrderDates(res.data.value);
        }
      }
    }
    return null;
  }

  async create(order: Omit<Order, 'id'>): Promise<Order> {
    const id = crypto.randomUUID();
    const newOrder = { ...order, id } as Order;
    if (!newOrder.createdAt) {
      newOrder.createdAt = new Date();
    }
    const timestamp = newOrder.createdAt.toISOString();

    const res = await this.client.put(this.getOrderKey(timestamp, id), newOrder);
    if (res.status === 'error') {
      throw new Error(`Failed to create order in ZetaDB: ${res.error?.message}`);
    }

    // Save mapping index
    await this.client.put(this.getOrderIdMapKey(id), timestamp);

    if (newOrder.customerId) {
      await this.client.put(`order:customer:${newOrder.customerId}:${timestamp}:${id}`, id);
    }

    return parseOrderDates(newOrder);
  }

  async update(id: string, updates: Partial<Order>): Promise<Order> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Order with ID ${id} not found`);
    }
    const updatedOrder = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    const timestamp = existing.createdAt.toISOString();
    const res = await this.client.put(this.getOrderKey(timestamp, id), updatedOrder);
    if (res.status === 'error') {
      throw new Error(`Failed to update order in ZetaDB: ${res.error?.message}`);
    }
    return parseOrderDates(updatedOrder);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    const timestamp = existing.createdAt.toISOString();
    await this.client.delete(this.getOrderKey(timestamp, id));
    await this.client.delete(this.getOrderIdMapKey(id));
    if (existing.customerId) {
      await this.client.delete(`order:customer:${existing.customerId}:${timestamp}:${id}`);
    }
  }

  async getPaginated(options: OrderQueryOptions): Promise<PaginatedResult<Order>> {
    const { limit, offset, customerId, status, paymentStatus, fulfillmentStatus } = options;

    const baseUrl = process.env.ZETADB_URL || 'http://localhost:8080';

    if (customerId) {
      const queryUrl = `${baseUrl}/query?q=order:customer:${customerId}:*&type=wildcard&limit=10000`;
      const keysRes = await fetch(queryUrl, {
        headers: {
          'X-API-Key': process.env.ZETADB_API_KEY || '',
        },
      });
      const keysData = await keysRes.json();

      if (keysData.status !== 'success' || !keysData.data?.results) {
        return { results: [], total: 0, limit, offset };
      }

      const resultsList = keysData.data.results;
      // Sort lexicographically by key (chronological order, latest first)
      resultsList.sort((a: any, b: any) => b.key.localeCompare(a.key));

      const orderIds = resultsList.map((r: any) => typeof r.value === 'string' ? r.value : r.value.value);
      let orders = (await Promise.all(orderIds.map((orderId: string) => this.getById(orderId))))
        .filter((o): o is Order => o !== null);

      if (status) {
        orders = orders.filter(o => o.status === status);
      }
      if (paymentStatus) {
        orders = orders.filter(o => o.paymentStatus === paymentStatus);
      }
      if (fulfillmentStatus) {
        orders = orders.filter(o => o.fulfillmentStatus === fulfillmentStatus);
      }

      const total = orders.length;
      const paginatedOrders = orders.slice(offset, offset + limit);

      return {
        results: paginatedOrders,
        total,
        limit,
        offset,
      };
    }

    const queryUrl = `${baseUrl}/query?q=order:*&type=wildcard&limit=10000`;
    const keysRes = await fetch(queryUrl, {
      headers: {
        'X-API-Key': process.env.ZETADB_API_KEY || '',
      },
    });
    const keysData = await keysRes.json();

    if (keysData.status !== 'success' || !keysData.data?.results) {
      return { results: [], total: 0, limit, offset };
    }

    // Filter out index mappings (starts with order:id: or order:customer:)
    let resultsList = keysData.data.results.filter(
      (r: any) => r.key && r.key.startsWith('order:') && !r.key.startsWith('order:id:') && !r.key.startsWith('order:customer:')
    );

    // Sort lexicographically by key (chronological order, latest first)
    resultsList.sort((a: any, b: any) => b.key.localeCompare(a.key));

    let orders: Order[] = resultsList.map((r: any) => {
      const val = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      return parseOrderDates(val);
    });

    // Apply filtering for admin / customer queries
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    if (paymentStatus) {
      orders = orders.filter(o => o.paymentStatus === paymentStatus);
    }
    if (fulfillmentStatus) {
      orders = orders.filter(o => o.fulfillmentStatus === fulfillmentStatus);
    }

    const total = orders.length;
    const paginatedOrders = orders.slice(offset, offset + limit);

    return {
      results: paginatedOrders,
      total,
      limit,
      offset,
    };
  }
}
