import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import * as orderService from '../services/order.service.ts';
import { sendSuccess } from '../utils/response.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';

export async function placeOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userProfile?.id;
    if (!userId) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'User profile not sync\'d or missing');
    }
    const { checkout_id, payment_method_id } = req.body;
    if (!checkout_id || !payment_method_id) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'checkout_id and payment_method_id are required');
    }

    const { order, processedItems } = await orderService.processCheckoutOrder(
      userId,
      checkout_id,
      payment_method_id
    );

    sendSuccess(res, {
      order_id: order.id,
      status: 'success',
      processed_items: processedItems
    }, 201);
  } catch (error) {
    next(error);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderHistory = await orderService.getOrders();
    sendSuccess(res, { orders: orderHistory });
  } catch (error) {
    next(error);
  }
}

