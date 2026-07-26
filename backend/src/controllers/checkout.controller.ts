import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import { sendSuccess } from '../utils/response.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';
import type { CheckoutSnapshot } from '../models/types/cart.types.ts';

const cartRepository = RepositoryFactory.getCartRepository();
const checkoutRepository = RepositoryFactory.getCheckoutRepository();

export async function initCheckout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userProfile?.id;
    if (!userId) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'User profile not sync\'d or missing');
    }
    const { source_cart_version } = req.body;
    if (typeof source_cart_version !== 'number') {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'source_cart_version must be a number');
    }

    const cart = await cartRepository.getCartVersion(userId, source_cart_version);
    if (!cart) {
      throw new AppError(404, StatusCodes.NOT_FOUND, `Cart version ${source_cart_version} not found in history`);
    }


    // Take snapshot
    const checkoutId = `chk_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
    
    const lockedItems = cart.items.map(item => ({
      sku: item.sku,
      qty: item.qty,
      locked_price: item.price
    }));

    const totalAmount = lockedItems.reduce((acc, item) => acc + (item.locked_price.amount * item.qty), 0);
    const lockedTotal = { amount: totalAmount, currency: 'USD' };

    const checkout: CheckoutSnapshot = {
      checkout_id: checkoutId,
      user_id: userId,
      status: 'active',
      expires_at: expiresAt,
      snapshot: {
        source_cart_version,
        locked_items: lockedItems,
        locked_total: lockedTotal
      },
      createdAt: new Date()
    };

    await checkoutRepository.create(checkout);

    sendSuccess(res, {
      checkout_id: checkout.checkout_id,
      status: checkout.status,
      expires_at: checkout.expires_at,
      snapshot: {
        source_cart_version: checkout.snapshot.source_cart_version,
        locked_items: checkout.snapshot.locked_items.map(item => ({
          sku: item.sku,
          qty: item.qty,
          locked_price: item.locked_price.amount
        })),
        locked_total: checkout.snapshot.locked_total.amount
      }
    }, 201);
  } catch (error) {
    next(error);
  }
}

export async function getCheckout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const checkoutId = req.params.checkout_id;
    if (!checkoutId || typeof checkoutId !== 'string') {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'checkout_id is required and must be a string');
    }

    const checkout = await checkoutRepository.getById(checkoutId);
    if (!checkout) {
      throw new AppError(404, StatusCodes.NOT_FOUND, `Checkout session ${checkoutId} not found`);
    }

    sendSuccess(res, {
      checkout_id: checkout.checkout_id,
      status: checkout.status,
      expires_at: checkout.expires_at,
      snapshot: {
        source_cart_version: checkout.snapshot.source_cart_version,
        locked_items: checkout.snapshot.locked_items.map(item => ({
          sku: item.sku,
          qty: item.qty,
          locked_price: item.locked_price.amount
        })),
        locked_total: checkout.snapshot.locked_total.amount
      }
    });
  } catch (error) {
    next(error);
  }
}
