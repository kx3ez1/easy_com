import type { Order } from '../types/order.types.ts';
import type { PaginatedResult } from './product.repository.ts';

export interface OrderQueryOptions {
  limit: number;
  offset: number;
  customerId?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
}

export interface IOrderRepository {
  getById(id: string): Promise<Order | null>;
  create(order: Omit<Order, 'id'>): Promise<Order>;
  update(id: string, order: Partial<Order>): Promise<Order>;
  getPaginated(options: OrderQueryOptions): Promise<PaginatedResult<Order>>;
}
