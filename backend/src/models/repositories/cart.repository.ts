import type { Cart, CheckoutSnapshot } from '../types/cart.types.ts';

export interface ICartRepository {
  getCart(userId: string): Promise<Cart>;
  saveCart(cart: Cart): Promise<Cart>;
  clearCartItems(userId: string, itemsToRemove: { sku: string; qty: number }[]): Promise<Cart>;
  getCartHistory(userId: string): Promise<Cart[]>;
  getCartVersion(userId: string, version: number): Promise<Cart | null>;
}

export interface ICheckoutRepository {
  create(checkout: CheckoutSnapshot): Promise<CheckoutSnapshot>;
  getById(checkoutId: string): Promise<CheckoutSnapshot | null>;
  updateStatus(checkoutId: string, status: "completed" | "expired"): Promise<void>;
  getCheckoutsByDate(datePrefix: string): Promise<CheckoutSnapshot[]>;
  getLiveLockedCheckouts(): Promise<CheckoutSnapshot[]>;
  getAllCheckouts(statusFilter?: 'live' | 'expired' | 'completed' | 'all'): Promise<CheckoutSnapshot[]>;
  delete(checkoutId: string): Promise<void>;
}

