import { describe, test, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { ZetaOrderRepository } from './order.zetadb.repository.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';
import type { Order } from '../types/order.types.ts';

describe('ZetaOrderRepository Integration Tests', () => {
  let repository: ZetaOrderRepository;
  let client: ZetaDBClient;
  let testOrderId: string;

  const testOrderData: Omit<Order, 'id'> = {
    customerId: 'cust-12345',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    fulfillmentStatus: 'UNFULFILLED',
    currency: 'USD',
    subtotalAmount: { amount: 100, currency: 'USD' },
    taxAmount: { amount: 8, currency: 'USD' },
    shippingCost: { amount: 15, currency: 'USD' },
    discountAmount: { amount: 0, currency: 'USD' },
    giftCardAmount: { amount: 0, currency: 'USD' },
    totalAmount: { amount: 123, currency: 'USD' },
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        name: 'Super Gadget',
        quantity: 1,
        unitPrice: { amount: 100, currency: 'USD' },
        lineTotal: { amount: 100, currency: 'USD' }
      }
    ],
    createdAt: new Date()
  };

  beforeAll(() => {
    process.env.ZETADB_URL = 'http://localhost:8081';
    process.env.ZETADB_API_KEY = '';
    repository = new ZetaOrderRepository();
    client = new ZetaDBClient();
  });

  afterAll(async () => {
    if (testOrderId) {
      await repository.delete(testOrderId);
    }
  });

  test('should create an order successfully', async () => {
    const created = await repository.create(testOrderData);
    expect(created.id).toBeDefined();
    testOrderId = created.id;
    expect(created.customerId).toBe('cust-12345');
    expect(created.status).toBe('PENDING');
  });

  test('should retrieve order by ID with matching values and Date types', async () => {
    const fetched = await repository.getById(testOrderId);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(testOrderId);
    expect(fetched?.customerId).toBe('cust-12345');
    expect(fetched?.createdAt).toBeInstanceOf(Date);
  });

  test('should update order fields successfully', async () => {
    const updated = await repository.update(testOrderId, { status: 'PROCESSING' });
    expect(updated.status).toBe('PROCESSING');
    
    const fetched = await repository.getById(testOrderId);
    expect(fetched?.status).toBe('PROCESSING');
  });

  test('should query and find the order using filter parameters (admin query)', async () => {
    const paginated = await repository.getPaginated({
      limit: 10,
      offset: 0,
      status: 'PROCESSING'
    });
    expect(paginated.results).toBeDefined();
    const found = paginated.results.find(o => o.id === testOrderId);
    expect(found).toBeDefined();
    expect(found?.status).toBe('PROCESSING');
  });

  test('should not return the order when querying with non-matching filters', async () => {
    const paginated = await repository.getPaginated({
      limit: 10,
      offset: 0,
      status: 'CANCELLED'
    });
    const found = paginated.results.find(o => o.id === testOrderId);
    expect(found).toBeUndefined();
  });

  test('should return null for non-existent order ID', async () => {
    const result = await repository.getById('non-existent-order-id');
    expect(result).toBeNull();
  });

  test('should query orders by customerId using the secondary index', async () => {
    const paginated = await repository.getPaginated({
      limit: 10,
      offset: 0,
      customerId: 'cust-12345'
    });
    expect(paginated.results).toBeDefined();
    const found = paginated.results.find(o => o.id === testOrderId);
    expect(found).toBeDefined();
    expect(found?.customerId).toBe('cust-12345');

    // Querying with non-matching customer ID
    const paginatedOther = await repository.getPaginated({
      limit: 10,
      offset: 0,
      customerId: 'cust-different'
    });
    const foundOther = paginatedOther.results.find(o => o.id === testOrderId);
    expect(foundOther).toBeUndefined();
  });
});
