import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import type { Order, OrderItem, Payment } from '../models/types/order.types.ts';
import type { CheckoutSnapshot } from '../models/types/cart.types.ts';
import type { Product } from '../models/types/catalog.types.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';

export interface CreateOrderInput {
  shippingAddress: string;
  items: {
    productId: string;
    productVariantId?: string;
    quantity: number;
  }[];
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  // Legacy / stub order placement helper
  throw new AppError(400, StatusCodes.BAD_REQUEST, 'Please use snapshot-based checkout flow');
}

export async function getOrders(): Promise<Order[]> {
  const orderRepo = RepositoryFactory.getOrderRepository();
  const result = await orderRepo.getPaginated({ limit: 10, offset: 0 });
  return result.results;
}

export async function findProductBySku(sku: string): Promise<{ product: Product; variantId?: string; name: string } | null> {
  const productRepo = RepositoryFactory.getProductRepository();
  const paginated = await productRepo.getPaginated({ limit: 10000, offset: 0 });
  for (const product of paginated.results) {
    if (product.sku === sku) {
      return { product, name: product.name };
    }
    if (product.variants) {
      for (const variant of product.variants) {
        if (variant.sku === sku) {
          const variantDesc = variant.attributes
            ? Object.entries(variant.attributes).map(([k, v]) => `${k}: ${v}`).join(' / ')
            : 'Variant';
          return { product, variantId: variant.id, name: `${product.name} (${variantDesc})` };
        }
      }
    }
  }
  return null;
}

export async function processCheckoutOrder(
  userId: string,
  checkoutId: string,
  paymentMethodId: string
): Promise<{ order: Order; processedItems: { sku: string; qty: number }[] }> {
  const checkoutRepo = RepositoryFactory.getCheckoutRepository();
  const productRepo = RepositoryFactory.getProductRepository();
  const orderRepo = RepositoryFactory.getOrderRepository();
  const cartRepo = RepositoryFactory.getCartRepository();

  // 1. Retrieve checkout snapshot
  const checkout = await checkoutRepo.getById(checkoutId);
  if (!checkout) {
    throw new AppError(404, StatusCodes.NOT_FOUND, `Checkout session ${checkoutId} not found`);
  }

  // 2. Validate checkout status and expiry
  if (checkout.status !== 'active') {
    throw new AppError(400, StatusCodes.BAD_REQUEST, `Checkout session is already ${checkout.status}`);
  }

  const expiresTime = new Date(checkout.expires_at).getTime();
  if (Date.now() > expiresTime) {
    await checkoutRepo.updateStatus(checkoutId, 'expired');
    throw new AppError(400, StatusCodes.BAD_REQUEST, 'Checkout session has expired');
  }

  // 3. Verify Inventory and Update stock
  const orderItems: OrderItem[] = [];
  const processedItems: { sku: string; qty: number }[] = [];

  for (const item of checkout.snapshot.locked_items) {
    const skuInfo = await findProductBySku(item.sku);
    if (!skuInfo) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, `Product with SKU ${item.sku} not found`);
    }

    const { product, variantId, name } = skuInfo;

    // Perform simple inventory track check
    if (variantId && product.variants) {
      const variantIndex = product.variants.findIndex(v => v.id === variantId);
      const variant = variantIndex !== -1 ? product.variants[variantIndex] : undefined;
      if (variant) {
        const trackInventory = variant.trackInventory !== false && product.trackInventory !== false;
        if (trackInventory) {
          const stock = variant.stockQuantity ?? 0;
          if (stock < item.qty) {
            throw new AppError(400, StatusCodes.BAD_REQUEST, `Insufficient inventory for SKU ${item.sku}`);
          }
          // Deduct
          variant.stockQuantity = stock - item.qty;
        }
      }
    } else {
      const trackInventory = product.trackInventory !== false;
      if (trackInventory) {
        const stock = product.stockQuantity ?? 0;
        if (stock < item.qty) {
          throw new AppError(400, StatusCodes.BAD_REQUEST, `Insufficient inventory for SKU ${item.sku}`);
        }
        // Deduct
        product.stockQuantity = stock - item.qty;
      }
    }

    // Update product in DB
    await productRepo.update(product.id, product);

    const itemCurrency = item.locked_price.currency || 'USD';
    const orderItem: OrderItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      sku: item.sku,
      name: name,
      quantity: item.qty,
      unitPrice: item.locked_price,
      lineTotal: { amount: item.locked_price.amount * item.qty, currency: itemCurrency }
    };
    if (variantId) {
      orderItem.productVariantId = variantId;
    }
    orderItems.push(orderItem);

    processedItems.push({
      sku: item.sku,
      qty: item.qty
    });
  }

  const orderCurrency = checkout.snapshot.locked_total.currency?.toUpperCase() || 'USD';

  // 4. Simulate Payment
  const payment: Payment = {
    id: `pay_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
    provider: 'SimulatedGateway',
    transactionId: paymentMethodId,
    amount: checkout.snapshot.locked_total,
    status: 'CAPTURED',
    type: 'SALE',
    createdAt: new Date()
  };

  // 5. Create Order
  const orderData: Omit<Order, 'id'> = {
    customerId: userId,
    status: 'COMPLETED',
    approvalStatus: 'APPROVED',
    paymentStatus: 'PAID',
    fulfillmentStatus: 'UNFULFILLED',
    currency: orderCurrency,
    subtotalAmount: checkout.snapshot.locked_total,
    taxAmount: { amount: 0, currency: orderCurrency },
    shippingCost: { amount: 0, currency: orderCurrency },
    discountAmount: { amount: 0, currency: orderCurrency },
    giftCardAmount: { amount: 0, currency: orderCurrency },
    totalAmount: checkout.snapshot.locked_total,
    items: orderItems,
    payments: [payment],
    createdAt: new Date()
  };

  const createdOrder = await orderRepo.create(orderData);

  // 6. Complete Checkout Session
  await checkoutRepo.updateStatus(checkoutId, 'completed');

  // 7. Targeted Cleanup of Live Cart
  await cartRepo.clearCartItems(userId, processedItems);

  return {
    order: createdOrder,
    processedItems
  };
}

export async function createPendingOrder(
  userId: string,
  checkoutId: string
): Promise<Order> {
  const checkoutRepo = RepositoryFactory.getCheckoutRepository();
  const orderRepo = RepositoryFactory.getOrderRepository();

  // 1. Retrieve checkout session
  const checkout = await checkoutRepo.getById(checkoutId);
  if (!checkout) {
    throw new AppError(404, StatusCodes.NOT_FOUND, `Checkout session ${checkoutId} not found`);
  }

  // 2. Validate checkout status and expiry
  if (checkout.status !== 'active') {
    throw new AppError(400, StatusCodes.BAD_REQUEST, `Checkout session is already ${checkout.status}`);
  }

  const expiresTime = new Date(checkout.expires_at).getTime();
  if (Date.now() > expiresTime) {
    await checkoutRepo.updateStatus(checkoutId, 'expired');
    throw new AppError(400, StatusCodes.BAD_REQUEST, 'Checkout session has expired');
  }

  // 3. Verify Stock Availability (without deducting)
  const orderItems: OrderItem[] = [];
  for (const item of checkout.snapshot.locked_items) {
    const skuInfo = await findProductBySku(item.sku);
    if (!skuInfo) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, `Product with SKU ${item.sku} not found`);
    }

    const { product, variantId, name } = skuInfo;

    if (variantId && product.variants) {
      const variantIndex = product.variants.findIndex(v => v.id === variantId);
      const variant = variantIndex !== -1 ? product.variants[variantIndex] : undefined;
      if (variant) {
        const trackInventory = variant.trackInventory !== false && product.trackInventory !== false;
        if (trackInventory) {
          const stock = variant.stockQuantity ?? 0;
          if (stock < item.qty) {
            throw new AppError(400, StatusCodes.BAD_REQUEST, `Insufficient inventory for SKU ${item.sku}`);
          }
        }
      }
    } else {
      const trackInventory = product.trackInventory !== false;
      if (trackInventory) {
        const stock = product.stockQuantity ?? 0;
        if (stock < item.qty) {
          throw new AppError(400, StatusCodes.BAD_REQUEST, `Insufficient inventory for SKU ${item.sku}`);
        }
      }
    }

    const itemCurrency = item.locked_price.currency || 'USD';
    const orderItem: OrderItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      sku: item.sku,
      name: name,
      quantity: item.qty,
      unitPrice: item.locked_price,
      lineTotal: { amount: item.locked_price.amount * item.qty, currency: itemCurrency }
    };
    if (variantId) {
      orderItem.productVariantId = variantId;
    }
    orderItems.push(orderItem);
  }

  const orderCurrency = checkout.snapshot.locked_total.currency?.toUpperCase() || 'USD';

  // 4. Create Order with status PENDING
  const orderData: Omit<Order, 'id'> = {
    customerId: userId,
    status: 'PENDING',
    approvalStatus: 'PENDING_REVIEW',
    paymentStatus: 'PENDING',
    fulfillmentStatus: 'UNFULFILLED',
    currency: orderCurrency,
    subtotalAmount: checkout.snapshot.locked_total,
    taxAmount: { amount: 0, currency: orderCurrency },
    shippingCost: { amount: 0, currency: orderCurrency },
    discountAmount: { amount: 0, currency: orderCurrency },
    giftCardAmount: { amount: 0, currency: orderCurrency },
    totalAmount: checkout.snapshot.locked_total,
    items: orderItems,
    payments: [],
    metadata: { checkoutId },
    createdAt: new Date()
  };

  const createdOrder = await orderRepo.create(orderData);
  return createdOrder;
}

