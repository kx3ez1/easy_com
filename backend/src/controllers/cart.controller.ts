import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import { findProductBySku } from '../services/order.service.ts';
import { sendSuccess } from '../utils/response.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';
import type { CartItem } from '../models/types/cart.types.ts';

const cartRepository = RepositoryFactory.getCartRepository();

async function populateCartProductDetails(items: CartItem[]): Promise<CartItem[]> {
  return await Promise.all(items.map(async (item) => {
    const skuInfo = await findProductBySku(item.sku);
    if (!skuInfo) {
      return {
        ...item,
        productId: null,
        productName: `Product ${item.sku}`,
        imageUrl: null,
        variantId: null,
        status: 'ARCHIVED',
        trackInventory: false,
        stockQuantity: 0,
        allowBackorder: false
      };
    }

    const { product, variantId, name } = skuInfo;
    let imageUrl = product.imageUrl;
    let stockQuantity = product.stockQuantity ?? 0;
    let trackInventory = product.trackInventory !== false;
    let allowBackorder = product.allowBackorder ?? false;

    if (variantId && product.variants) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        if (variant.imageUrl) {
          imageUrl = variant.imageUrl;
        }
        if (variant.stockQuantity !== undefined) {
          stockQuantity = variant.stockQuantity;
        }
        if (variant.trackInventory !== undefined) {
          trackInventory = variant.trackInventory !== false && product.trackInventory !== false;
        }
        if (variant.allowBackorder !== undefined) {
          allowBackorder = variant.allowBackorder;
        }
      }
    }

    return {
      ...item,
      productId: product.id,
      productName: name,
      imageUrl: imageUrl,
      variantId: variantId || null,
      status: product.status,
      trackInventory: trackInventory,
      stockQuantity: stockQuantity,
      allowBackorder: allowBackorder
    };
  }));
}

export async function getCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userProfile?.id;
    if (!userId) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'User profile not sync\'d or missing');
    }
    const cart = await cartRepository.getCart(userId);
    const populatedItems = await populateCartProductDetails(cart.items);
    sendSuccess(res, {
      cart_version: cart.cart_version,
      items: populatedItems
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userProfile?.id;
    if (!userId) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'User profile not sync\'d or missing');
    }
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'Items must be an array of CartItem');
    }

    const currentCart = await cartRepository.getCart(userId);
    
    // Map items to match internal interface with Money objects
    currentCart.items = items.map((item: any) => {
      const isPriceNumber = typeof item.price === 'number';
      const isPriceMoneyObject = item.price && typeof item.price === 'object' && typeof item.price.amount === 'number';

      if (!item.sku || typeof item.qty !== 'number' || (!isPriceNumber && !isPriceMoneyObject)) {
        throw new AppError(400, StatusCodes.BAD_REQUEST, 'Invalid CartItem format. Required: sku, qty, price (number or Money object)');
      }

      const priceMoney = isPriceNumber 
        ? { amount: item.price, currency: 'USD' } 
        : { amount: item.price.amount, currency: item.price.currency || 'USD' };

      return {
        sku: item.sku,
        qty: item.qty,
        price: priceMoney
      };
    });

    currentCart.cart_version += 1;

    const savedCart = await cartRepository.saveCart(currentCart);
    const populatedItems = await populateCartProductDetails(savedCart.items);

    sendSuccess(res, {
      cart_version: savedCart.cart_version,
      items: populatedItems
    });
  } catch (error) {
    next(error);
  }
}
