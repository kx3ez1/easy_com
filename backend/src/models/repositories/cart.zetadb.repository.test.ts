import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { RepositoryFactory } from './repository.factory.ts';
import { ZetaDBClient } from '../../database/zetadb/zetadb.client.ts';
import { processCheckoutOrder, createPendingOrder } from '../../services/order.service.ts';
import type { Product } from '../types/catalog.types.ts';
import type { CartItem } from "../types/cart.types.ts"

describe('Mutable Cart & Immutable Checkout Integration Tests', () => {
  let cartRepo: any;
  let checkoutRepo: any;
  let productRepo: any;
  let orderRepo: any;
  let client: ZetaDBClient;

  const userId = `user_${crypto.randomUUID().slice(0, 8)}`;
  let testProduct1: Product;
  let testProduct2: Product;

  beforeAll(async () => {
    jest.setTimeout(30000);
    process.env.ZETADB_URL = 'http://localhost:8081';
    process.env.ZETADB_API_KEY = '';

    // Clear static caches to force instantiation using test environment port
    (RepositoryFactory as any).cartRepository = undefined;
    (RepositoryFactory as any).checkoutRepository = undefined;
    (RepositoryFactory as any).productRepository = undefined;
    (RepositoryFactory as any).orderRepository = undefined;

    cartRepo = RepositoryFactory.getCartRepository();
    checkoutRepo = RepositoryFactory.getCheckoutRepository();
    productRepo = RepositoryFactory.getProductRepository();
    orderRepo = RepositoryFactory.getOrderRepository();
    client = new ZetaDBClient();

    // Create test products with SKUs and stock quantity
    testProduct1 = await productRepo.create({
      name: 'Product A1',
      slug: 'product-a1',
      sku: 'A1',
      price: { amount: 10.00, currency: 'USD' },
      inventoryMode: 'SIMPLE',
      stockQuantity: 10,
      trackInventory: true,
      imageUrl: 'http://example.com/a1.png',
      status: 'ACTIVE'
    });

    testProduct2 = await productRepo.create({
      name: 'Product B2',
      slug: 'product-b2',
      sku: 'B2',
      price: { amount: 15.00, currency: 'USD' },
      inventoryMode: 'SIMPLE',
      stockQuantity: 5,
      trackInventory: true,
      imageUrl: 'http://example.com/b2.png',
      status: 'ACTIVE'
    });
  });

  afterAll(async () => {
    await Promise.all([
      client.delete(`cart:${userId}`),
      client.delete(`product:${testProduct1.id}`),
      client.delete(`product:${testProduct2.id}`)
    ]);
  });

  test('should initialize and increment version on cart changes', async () => {
    // 1. Get empty cart
    const cart = await cartRepo.getCart(userId);
    expect(cart.cart_version).toBe(0);
    expect(cart.items.length).toBe(0);

    // 2. Add items to live cart
    cart.items = [
      { sku: 'A1', qty: 2, price: { amount: 10.00, currency: 'USD' } },
      { sku: 'B2', qty: 2, price: { amount: 15.00, currency: 'USD' } }
    ];
    cart.cart_version = 14; // Let's set it to 14 to match user sample
    await cartRepo.saveCart(cart);

    const updatedCart = await cartRepo.getCart(userId);
    expect(updatedCart.cart_version).toBe(14);
    expect(updatedCart.items.length).toBe(2);
  });

  test('should create checkout snapshot and remain immutable when cart changes', async () => {
    const liveCart = await cartRepo.getCart(userId);
    expect(liveCart.cart_version).toBe(14);

    // Create checkout snapshot
    const checkoutId = `chk_${crypto.randomUUID().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const lockedItems = liveCart.items.map((item: CartItem) => ({
      sku: item.sku,
      qty: item.qty,
      locked_price: item.price
    }));

    const checkoutSnapshot = await checkoutRepo.create({
      checkout_id: checkoutId,
      user_id: userId,
      status: 'active',
      expires_at: expiresAt,
      snapshot: {
        source_cart_version: 14,
        locked_items: lockedItems,
        locked_total: { amount: 50.00, currency: 'USD' }
      },
      createdAt: new Date()
    });

    expect(checkoutSnapshot.checkout_id).toBe(checkoutId);
    expect(checkoutSnapshot.snapshot.source_cart_version).toBe(14);

    // Modify the live cart (version 15)
    liveCart.items.push({ sku: 'C3', qty: 1, price: { amount: 5.00, currency: 'USD' } });
    liveCart.cart_version = 15;
    await cartRepo.saveCart(liveCart);

    // Assert that the checkout snapshot remains unchanged
    const fetchedCheckout = await checkoutRepo.getById(checkoutId);
    expect(fetchedCheckout).toBeDefined();
    expect(fetchedCheckout?.snapshot.source_cart_version).toBe(14);
    expect(fetchedCheckout?.snapshot.locked_items.length).toBe(2);
    expect(fetchedCheckout?.snapshot.locked_items.map((i: CartItem) => i.sku)).not.toContain('C3');

    // Assert live cart indeed updated
    const fetchedCart = await cartRepo.getCart(userId);
    expect(fetchedCart.cart_version).toBe(15);
    expect(fetchedCart.items.length).toBe(3);

    // Clean up checkout
    await checkoutRepo.delete(checkoutId);
  });

  test('should complete order, deduct inventory, and clean up only checkout items from live cart', async () => {
    // Setup: Reset live cart to contain:
    // A1: 2, B2: 2, C3: 1 at version 15
    const liveCart = await cartRepo.getCart(userId);
    liveCart.items = [
      { sku: 'A1', qty: 2, price: { amount: 10.00, currency: 'USD' } },
      { sku: 'B2', qty: 2, price: { amount: 15.00, currency: 'USD' } },
      { sku: 'C3', qty: 1, price: { amount: 5.00, currency: 'USD' } }
    ];
    liveCart.cart_version = 15;
    await cartRepo.saveCart(liveCart);

    // Create checkout snapshot for A1 (qty: 1) and B2 (qty: 2) at source_cart_version: 15
    const checkoutId = `chk_test_cleanup`;
    const lockedItems = [
      { sku: 'A1', qty: 1, locked_price: { amount: 10.00, currency: 'USD' } },
      { sku: 'B2', qty: 2, locked_price: { amount: 15.00, currency: 'USD' } }
    ];

    await checkoutRepo.create({
      checkout_id: checkoutId,
      user_id: userId,
      status: 'active',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      snapshot: {
        source_cart_version: 15,
        locked_items: lockedItems,
        locked_total: { amount: 40.00, currency: 'USD' }
      },
      createdAt: new Date()
    });

    // Verify initial stock of products
    const prod1Before = await productRepo.getById(testProduct1.id);
    const prod2Before = await productRepo.getById(testProduct2.id);
    expect(prod1Before?.stockQuantity).toBe(10);
    expect(prod2Before?.stockQuantity).toBe(5);

    // Process order
    const result = await processCheckoutOrder(userId, checkoutId, 'pm_test_123');
    expect(result.order).toBeDefined();
    expect(result.processedItems.length).toBe(2);

    // Verify stock deduction
    const prod1After = await productRepo.getById(testProduct1.id);
    const prod2After = await productRepo.getById(testProduct2.id);
    expect(prod1After?.stockQuantity).toBe(9); // 10 - 1
    expect(prod2After?.stockQuantity).toBe(3); // 5 - 2

    // Verify checkout status
    const checkoutAfter = await checkoutRepo.getById(checkoutId);
    expect(checkoutAfter?.status).toBe('completed');

    // Verify live cart contents post-cleanup:
    // Original items at v15: A1: 2, B2: 2, C3: 1
    // Snapshot items completed: A1: 1, B2: 2
    // Expected items: A1: 1, C3: 1 (B2 is fully removed since 2 - 2 = 0)
    // Expected cart version: 16 (incremented from 15)
    const cartAfter = await cartRepo.getCart(userId);
    expect(cartAfter.cart_version).toBe(16);
    expect(cartAfter.items.length).toBe(2);

    const a1Item = cartAfter.items.find((i: CartItem) => i.sku === 'A1');
    expect(a1Item?.qty).toBe(1);

    const b2Item = cartAfter.items.find((i: CartItem) => i.sku === 'B2');
    expect(b2Item).toBeUndefined();

    const c3Item = cartAfter.items.find((i: CartItem) => i.sku === 'C3');
    expect(c3Item?.qty).toBe(1);

    // Clean up
    await checkoutRepo.delete(checkoutId);
    await client.delete(`order:id:${result.order.id}`);
  });

  test('should handle concurrent updates from other devices and subtractive cleanup', async () => {
    // 1. Initialize cart with A1: 2, B2: 2 at Version 20
    const liveCart = await cartRepo.getCart(userId);
    liveCart.items = [
      { sku: 'A1', qty: 2, price: { amount: 10.00, currency: 'USD' } },
      { sku: 'B2', qty: 2, price: { amount: 15.00, currency: 'USD' } }
    ];
    liveCart.cart_version = 20;
    await cartRepo.saveCart(liveCart);

    // 2. Device 1 starts Checkout for A1: 2 and B2: 2
    const checkoutId = `chk_concurrent_test`;
    const lockedItems = [
      { sku: 'A1', qty: 2, locked_price: { amount: 10.00, currency: 'USD' } },
      { sku: 'B2', qty: 2, locked_price: { amount: 15.00, currency: 'USD' } }
    ];
    await checkoutRepo.create({
      checkout_id: checkoutId,
      user_id: userId,
      status: 'active',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      snapshot: {
        source_cart_version: 20,
        locked_items: lockedItems,
        locked_total: { amount: 50.00, currency: 'USD' }
      },
      createdAt: new Date()
    });

    // 3. Device 2 concurrently modifies the cart:
    //    - Changes A1 quantity to 5
    //    - Removes B2
    //    - Adds new item C3: 3
    //    Global cart is updated to version 21.
    const concurrentCart = await cartRepo.getCart(userId);
    expect(concurrentCart.cart_version).toBe(20);
    concurrentCart.items = [
      { sku: 'A1', qty: 5, price: { amount: 10.00, currency: 'USD' } },
      { sku: 'C3', qty: 3, price: { amount: 5.00, currency: 'USD' } }
    ];
    concurrentCart.cart_version = 21;
    await cartRepo.saveCart(concurrentCart);

    // 4. Device 1 completes checkout session (chk_concurrent_test)
    //    This processes the checkout and triggers clearCartItems for A1: 2, B2: 2
    const result = await processCheckoutOrder(userId, checkoutId, 'pm_test_456');
    expect(result.order).toBeDefined();

    // 5. Verify subtractive post-checkout cleanup of global cart:
    //    - A1: 5 (live) - 2 (checked out) = 3 (remaining)
    //    - B2: 0 (live) - 2 (checked out) = -2 -> clamped to 0 -> removed
    //    - C3: 3 (live) - 0 (checked out) = 3 (untouched)
    //    - Global cart version should be incremented to 22.
    const finalCart = await cartRepo.getCart(userId);
    expect(finalCart.cart_version).toBe(22);
    expect(finalCart.items.length).toBe(2);

    const a1Item = finalCart.items.find((i: CartItem) => i.sku === 'A1');
    expect(a1Item?.qty).toBe(3);

    const c3Item = finalCart.items.find((i: CartItem) => i.sku === 'C3');
    expect(c3Item?.qty).toBe(3);

    const b2Item = finalCart.items.find((i: CartItem) => i.sku === 'B2');
    expect(b2Item).toBeUndefined();

    // Clean up
    await checkoutRepo.delete(checkoutId);
    await client.delete(`order:id:${result.order.id}`);
  });

  test('should retrieve checkout snapshots created on a specific date', async () => {
    const today = new Date();
    const datePrefix = today.toISOString().split('T')[0]; // e.g. YYYY-MM-DD

    // Create checkouts
    const chkToday = `chk_today_${crypto.randomUUID().slice(0, 8)}`;
    const chkPast = `chk_past_${crypto.randomUUID().slice(0, 8)}`;

    const todayDate = new Date();
    const pastDate = new Date();
    pastDate.setDate(todayDate.getDate() - 2); // 2 days ago

    await checkoutRepo.create({
      checkout_id: chkToday,
      user_id: userId,
      status: 'active',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      snapshot: {
        source_cart_version: 1,
        locked_items: [],
        locked_total: { amount: 0, currency: 'USD' }
      },
      createdAt: todayDate
    });

    await checkoutRepo.create({
      checkout_id: chkPast,
      user_id: userId,
      status: 'active',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      snapshot: {
        source_cart_version: 1,
        locked_items: [],
        locked_total: { amount: 0, currency: 'USD' }
      },
      createdAt: pastDate
    });

    // Fetch checkouts for today
    const todayCheckouts = await checkoutRepo.getCheckoutsByDate(datePrefix);
    const todayIds = todayCheckouts.map((c: any) => c.checkout_id);
    expect(todayIds).toContain(chkToday);
    expect(todayIds).not.toContain(chkPast);

    // Clean up
    await checkoutRepo.delete(chkToday);
    await checkoutRepo.delete(chkPast);
  });

  test('should retrieve live locked checkouts filtering out completed and expired ones', async () => {
    const chkLive = `chk_live_${crypto.randomUUID().slice(0, 8)}`;
    const chkExpired = `chk_exp_${crypto.randomUUID().slice(0, 8)}`;
    const chkCompleted = `chk_comp_${crypto.randomUUID().slice(0, 8)}`;

    const now = new Date();
    await checkoutRepo.create({
      checkout_id: chkLive,
      user_id: 'user_live',
      status: 'active',
      expires_at: new Date(now.getTime() + 300000).toISOString(),
      snapshot: { source_cart_version: 1, locked_items: [], locked_total: { amount: 10, currency: 'USD' } },
      createdAt: now
    });

    await checkoutRepo.create({
      checkout_id: chkExpired,
      user_id: 'user_expired',
      status: 'active',
      expires_at: new Date(now.getTime() - 300000).toISOString(),
      snapshot: { source_cart_version: 1, locked_items: [], locked_total: { amount: 10, currency: 'USD' } },
      createdAt: now
    });

    await checkoutRepo.create({
      checkout_id: chkCompleted,
      user_id: 'user_completed',
      status: 'completed',
      expires_at: new Date(now.getTime() + 300000).toISOString(),
      snapshot: { source_cart_version: 1, locked_items: [], locked_total: { amount: 10, currency: 'USD' } },
      createdAt: now
    });

    const liveCheckouts = await checkoutRepo.getLiveLockedCheckouts();
    const liveIds = liveCheckouts.map((c: any) => c.checkout_id);

    expect(liveIds).toContain(chkLive);
    expect(liveIds).not.toContain(chkExpired);
    expect(liveIds).not.toContain(chkCompleted);

    await checkoutRepo.delete(chkLive);
    await checkoutRepo.delete(chkExpired);
    await checkoutRepo.delete(chkCompleted);
  });

  test('should get cart version history and retrieve specific version', async () => {
    const historyUserId = `user_history_${crypto.randomUUID().slice(0, 8)}`;
    
    // Save version 1
    const cartV1 = {
      user_id: historyUserId,
      cart_version: 1,
      items: [{ sku: 'A1', qty: 1, price: { amount: 10.00, currency: 'USD' } }],
      updatedAt: new Date()
    };
    await cartRepo.saveCart(cartV1);

    // Save version 2
    const cartV2 = {
      user_id: historyUserId,
      cart_version: 2,
      items: [{ sku: 'A1', qty: 2, price: { amount: 10.00, currency: 'USD' } }],
      updatedAt: new Date()
    };
    await cartRepo.saveCart(cartV2);

    // Test getCartVersion
    const fetchedV1 = await cartRepo.getCartVersion(historyUserId, 1);
    expect(fetchedV1).toBeDefined();
    expect(fetchedV1?.cart_version).toBe(1);
    expect(fetchedV1?.items[0].qty).toBe(1);

    const fetchedV2 = await cartRepo.getCartVersion(historyUserId, 2);
    expect(fetchedV2).toBeDefined();
    expect(fetchedV2?.cart_version).toBe(2);
    expect(fetchedV2?.items[0].qty).toBe(2);

    const fetchedV3 = await cartRepo.getCartVersion(historyUserId, 3);
    expect(fetchedV3).toBeNull();

    // Test getCartHistory
    const history = await cartRepo.getCartHistory(historyUserId);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].cart_version).toBe(2); // Sorted descending
    expect(history[1].cart_version).toBe(1);

    // Clean up
    await client.delete(`cart:${historyUserId}`);
    await client.delete(`cart_history:${historyUserId}:1`);
    await client.delete(`cart_history:${historyUserId}:2`);
  });

  test('should update checkout status or fail if not found', async () => {
    const checkoutId = `chk_status_${crypto.randomUUID().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await checkoutRepo.create({
      checkout_id: checkoutId,
      user_id: userId,
      status: 'active',
      expires_at: expiresAt,
      snapshot: {
        source_cart_version: 1,
        locked_items: [],
        locked_total: { amount: 0, currency: 'USD' }
      },
      createdAt: new Date()
    });

    // Update to completed
    await checkoutRepo.updateStatus(checkoutId, 'completed');
    const updated = await checkoutRepo.getById(checkoutId);
    expect(updated?.status).toBe('completed');

    // Attempting to update a non-existent checkout should throw
    await expect(checkoutRepo.updateStatus('non_existent_checkout_id', 'completed')).rejects.toThrow('Checkout snapshot with ID non_existent_checkout_id not found');

    // Clean up
    await checkoutRepo.delete(checkoutId);
  });

  describe('createPendingOrder', () => {
    test('should successfully create a pending order with correct status and totals', async () => {
      const checkoutId = `chk_pending_success_${crypto.randomUUID().slice(0, 8)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await checkoutRepo.create({
        checkout_id: checkoutId,
        user_id: userId,
        status: 'active',
        expires_at: expiresAt,
        snapshot: {
          source_cart_version: 1,
          locked_items: [
            { sku: 'A1', qty: 1, locked_price: { amount: 10.00, currency: 'USD' } }
          ],
          locked_total: { amount: 10.00, currency: 'USD' }
        },
        createdAt: new Date()
      });

      const pendingOrder = await createPendingOrder(userId, checkoutId);
      expect(pendingOrder?.status).toBe('PENDING');
      expect(pendingOrder?.paymentStatus).toBe('PENDING');
      expect(pendingOrder?.approvalStatus).toBe('PENDING_REVIEW');
      expect(pendingOrder?.totalAmount?.amount).toBe(10.00);
      expect(pendingOrder?.items?.length).toBe(1);
      expect(pendingOrder?.items?.[0]?.sku).toBe('A1');

      // Clean up
      await checkoutRepo.delete(checkoutId);
      if (pendingOrder?.id) {
        await client.delete(`order:id:${pendingOrder.id}`);
      }
    });

    test('should fail if checkout is expired', async () => {
      const checkoutId = `chk_pending_expired_${crypto.randomUUID().slice(0, 8)}`;
      const expiresAt = new Date(Date.now() - 5 * 1000).toISOString(); // Expired 5s ago

      await checkoutRepo.create({
        checkout_id: checkoutId,
        user_id: userId,
        status: 'active',
        expires_at: expiresAt,
        snapshot: {
          source_cart_version: 1,
          locked_items: [
            { sku: 'A1', qty: 1, locked_price: { amount: 10.00, currency: 'USD' } }
          ],
          locked_total: { amount: 10.00, currency: 'USD' }
        },
        createdAt: new Date()
      });

      await expect(createPendingOrder(userId, checkoutId)).rejects.toThrow('Checkout session has expired');

      // Verify checkout status updated to expired
      const updatedCheckout = await checkoutRepo.getById(checkoutId);
      expect(updatedCheckout?.status).toBe('expired');

      // Clean up
      await checkoutRepo.delete(checkoutId);
    });

    test('should fail if stock is insufficient', async () => {
      const checkoutId = `chk_pending_stock_${crypto.randomUUID().slice(0, 8)}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await checkoutRepo.create({
        checkout_id: checkoutId,
        user_id: userId,
        status: 'active',
        expires_at: expiresAt,
        snapshot: {
          source_cart_version: 1,
          locked_items: [
            { sku: 'B2', qty: 100, locked_price: { amount: 15.00, currency: 'USD' } } // Only 5 in stock
          ],
          locked_total: { amount: 1500.00, currency: 'USD' }
        },
        createdAt: new Date()
      });

      await expect(createPendingOrder(userId, checkoutId)).rejects.toThrow('Insufficient inventory for SKU B2');

      // Clean up
      await checkoutRepo.delete(checkoutId);
    });
  });
});
