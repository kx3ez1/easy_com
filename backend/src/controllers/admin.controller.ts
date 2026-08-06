import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import { sendSuccess } from '../utils/response.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';

// Users
export async function getAllUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const userRepo = RepositoryFactory.getUserProfileRepository();
    const result = await userRepo.getPaginated({ limit, offset });
    
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function modifyUserProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (!id) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'User ID is required');
    }

    const userRepo = RepositoryFactory.getUserProfileRepository();
    // Repository method signature enforces omitting 'role', so we can pass updates directly
    // but to be safe we cast or omit it ourselves
    const safeUpdates = { ...updates };
    delete safeUpdates.role;
    
    const updated = await userRepo.update(id as string, safeUpdates);
    sendSuccess(res, { profile: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id) throw new AppError(400, StatusCodes.BAD_REQUEST, 'User ID is required');
    
    const userRepo = RepositoryFactory.getUserProfileRepository();
    await userRepo.delete(id);
    
    sendSuccess(res, { message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// Products
export async function getAllProducts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const categorySlug = req.query.categorySlug as string | undefined;
    const searchQuery = req.query.searchQuery as string | undefined;

    const options: any = { limit, offset };
    if (categorySlug !== undefined) options.categorySlug = categorySlug;
    if (searchQuery !== undefined) options.searchQuery = searchQuery;

    const productRepo = RepositoryFactory.getProductRepository();
    const result = await productRepo.getPaginated(options);

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const productData = req.body;
    
    // Enforce Money object for price
    if (typeof productData.price === 'number') {
      productData.price = { amount: productData.price, currency: 'USD' };
    }

    const productRepo = RepositoryFactory.getProductRepository();
    const product = await productRepo.create(productData);
    
    sendSuccess(res, { product }, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const updates = req.body;
    if (!id) throw new AppError(400, StatusCodes.BAD_REQUEST, 'Product ID is required');

    // Enforce Money object for price
    if (typeof updates.price === 'number') {
      updates.price = { amount: updates.price, currency: 'USD' };
    }

    const productRepo = RepositoryFactory.getProductRepository();
    const updated = await productRepo.update(id, updates);
    sendSuccess(res, { product: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id) throw new AppError(400, StatusCodes.BAD_REQUEST, 'Product ID is required');

    const productRepo = RepositoryFactory.getProductRepository();
    await productRepo.delete(id);
    sendSuccess(res, { message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// Orders
export async function getAllOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;
    const paymentStatus = req.query.paymentStatus as string | undefined;
    const customerId = (req.query.customerId || req.query.userId) as string | undefined;

    const options: any = { limit, offset };
    if (status !== undefined) options.status = status;
    if (paymentStatus !== undefined) options.paymentStatus = paymentStatus;
    if (customerId !== undefined) options.customerId = customerId;

    const orderRepo = RepositoryFactory.getOrderRepository();
    const result = await orderRepo.getPaginated(options);

    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderData = req.body;
    
    const orderRepo = RepositoryFactory.getOrderRepository();
    const order = await orderRepo.create(orderData);
    
    sendSuccess(res, { order }, 201);
  } catch (error) {
    next(error);
  }
}

export async function deleteOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id) throw new AppError(400, StatusCodes.BAD_REQUEST, 'Order ID is required');

    const orderRepo = RepositoryFactory.getOrderRepository();
    await orderRepo.delete(id);
    sendSuccess(res, { message: 'Order deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, fulfillmentStatus } = req.body;

    if (!id) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'Order ID is required');
    }

    const orderRepo = RepositoryFactory.getOrderRepository();
    const updates: any = {};
    if (status) updates.status = status;
    if (fulfillmentStatus) updates.fulfillmentStatus = fulfillmentStatus;

    const updated = await orderRepo.update(id as string, updates);
    sendSuccess(res, { order: updated });
  } catch (error) {
    next(error);
  }
}

export async function updatePaymentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!id || !paymentStatus) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'Order ID and paymentStatus are required');
    }

    const orderRepo = RepositoryFactory.getOrderRepository();
    const updated = await orderRepo.update(id as string, { paymentStatus: paymentStatus as any });
    sendSuccess(res, { order: updated });
  } catch (error) {
    next(error);
  }
}

export async function modifyOrderDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body; // In a real app, sanitize these!

    if (!id) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'Order ID is required');
    }

    const orderRepo = RepositoryFactory.getOrderRepository();
    const updated = await orderRepo.update(id as string, updates);
    sendSuccess(res, { order: updated });
  } catch (error) {
    next(error);
  }
}

// Analytics
export async function getAnalyticsOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderRepo = RepositoryFactory.getOrderRepository();
    const userRepo = RepositoryFactory.getUserProfileRepository();

    // Fetch all for a rough summary (can be optimized if dataset gets massive)
    // Here we will just use paginated methods with a larger limit for now, 
    // or rely on a dedicated analytics query method. 
    // This is a naive implementation matching existing capabilities:
    const ordersRes = await orderRepo.getPaginated({ limit: 1000, offset: 0 });
    const usersRes = await userRepo.getPaginated({ limit: 1000, offset: 0 });

    let totalRevenue = 0;
    let completedOrders = 0;
    
    for (const order of ordersRes.results) {
      if (order.status !== 'CANCELLED') {
        totalRevenue += order.totalAmount.amount;
        completedOrders++;
      }
    }

    sendSuccess(res, {
      totalRevenue,
      completedOrders,
      totalOrders: ordersRes.total,
      totalUsers: usersRes.total
    });
  } catch (error) {
    next(error);
  }
}

// Checkouts
export async function getLiveLockedCheckouts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = (req.query.status as 'live' | 'expired' | 'completed' | 'all') || 'live';
    const checkoutRepo = RepositoryFactory.getCheckoutRepository();
    const checkouts = await checkoutRepo.getAllCheckouts(status);
    sendSuccess(res, { checkouts });
  } catch (error) {
    next(error);
  }
}
