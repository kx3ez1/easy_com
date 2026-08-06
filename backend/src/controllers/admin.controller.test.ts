import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import {
  getAllUsers,
  getAllProducts,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  modifyOrderDetails,
  getAnalyticsOverview,
  getLiveLockedCheckouts,
  modifyUserProfile,
  deleteUser,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  deleteOrder
} from './admin.controller.ts';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';

describe('AdminController Unit Tests', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let responseData: any;
  let responseStatus: number;

  beforeEach(() => {
    responseData = null;
    responseStatus = 200;
    mockRequest = {
      query: {},
      params: {},
      body: {},
      userProfile: {
        id: 'admin-123',
        uid: 'uid-admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: new Date()
      }
    };
    mockResponse = {
      status: (jest.fn() as any).mockImplementation((code: number) => {
        responseStatus = code;
        return mockResponse as Response;
      }),
      json: (jest.fn() as any).mockImplementation((data: any) => {
        responseData = data;
        return mockResponse as Response;
      })
    };
    mockNext = jest.fn() as any;
  });

  test('getAllUsers should return paginated users', async () => {
    const mockGetPaginated = jest.fn<any>().mockResolvedValue({
      results: [{ id: 'u1' }],
      total: 1,
      limit: 50,
      offset: 0
    });

    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      getPaginated: mockGetPaginated
    } as any);

    await getAllUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockGetPaginated).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    expect(responseData.status).toBe('success');
    expect(responseData.data.results).toHaveLength(1);
    expect(responseData.data.total).toBe(1);
  });

  test('getAllProducts should return paginated products', async () => {
    const mockGetPaginated = jest.fn<any>().mockResolvedValue({
      results: [],
      total: 0,
      limit: 50,
      offset: 0
    });

    jest.spyOn(RepositoryFactory, 'getProductRepository').mockReturnValue({
      getPaginated: mockGetPaginated
    } as any);

    await getAllProducts(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockGetPaginated).toHaveBeenCalledWith({ limit: 50, offset: 0, categorySlug: undefined, searchQuery: undefined });
    expect(responseData.status).toBe('success');
    expect(responseData.data.total).toBe(0);
  });

  test('getAllOrders should return paginated orders', async () => {
    const mockGetPaginated = jest.fn<any>().mockResolvedValue({
      results: [],
      total: 0,
      limit: 50,
      offset: 0
    });

    jest.spyOn(RepositoryFactory, 'getOrderRepository').mockReturnValue({
      getPaginated: mockGetPaginated
    } as any);

    await getAllOrders(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockGetPaginated).toHaveBeenCalledWith({ limit: 50, offset: 0, status: undefined, paymentStatus: undefined, customerId: undefined });
    expect(responseData.status).toBe('success');
  });

  test('getAllOrders should support filtering by customerId or userId', async () => {
    const mockGetPaginated = jest.fn<any>().mockResolvedValue({
      results: [{ id: 'order-1', customerId: 'user-123' }],
      total: 1,
      limit: 50,
      offset: 0
    });

    jest.spyOn(RepositoryFactory, 'getOrderRepository').mockReturnValue({
      getPaginated: mockGetPaginated
    } as any);

    mockRequest.query = { userId: 'user-123' };
    await getAllOrders(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockGetPaginated).toHaveBeenCalledWith({ limit: 50, offset: 0, status: undefined, paymentStatus: undefined, customerId: 'user-123' });
    expect(responseData.status).toBe('success');
    expect(responseData.data.results).toHaveLength(1);
  });

  test('updateOrderStatus should update and return order', async () => {
    const mockUpdate = jest.fn<any>().mockResolvedValue({ id: 'o1', status: 'SHIPPED' });

    jest.spyOn(RepositoryFactory, 'getOrderRepository').mockReturnValue({
      update: mockUpdate
    } as any);

    mockRequest.params = { id: 'o1' };
    mockRequest.body = { status: 'SHIPPED' };
    await updateOrderStatus(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockUpdate).toHaveBeenCalledWith('o1', { status: 'SHIPPED' });
    expect(responseData.status).toBe('success');
    expect(responseData.data.order.status).toBe('SHIPPED');
  });

  test('updatePaymentStatus should update and return order', async () => {
    const mockUpdate = jest.fn<any>().mockResolvedValue({ id: 'o1', paymentStatus: 'PAID' });

    jest.spyOn(RepositoryFactory, 'getOrderRepository').mockReturnValue({
      update: mockUpdate
    } as any);

    mockRequest.params = { id: 'o1' };
    mockRequest.body = { paymentStatus: 'PAID' };
    await updatePaymentStatus(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockUpdate).toHaveBeenCalledWith('o1', { paymentStatus: 'PAID' });
    expect(responseData.status).toBe('success');
  });

  test('modifyUserProfile should update and return user profile', async () => {
    const mockUpdate = jest.fn<any>().mockResolvedValue({ id: 'u1', name: 'Updated Name' });

    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      update: mockUpdate
    } as any);

    mockRequest.params = { id: 'u1' };
    mockRequest.body = { name: 'Updated Name', role: 'ADMIN' };
    await modifyUserProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockUpdate).toHaveBeenCalledWith('u1', { name: 'Updated Name' });
    expect(responseData.status).toBe('success');
    expect(responseData.data.profile.name).toBe('Updated Name');
  });

  test('deleteUser should delete user and return success message', async () => {
    const mockDelete = jest.fn<any>().mockResolvedValue(true);

    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      delete: mockDelete
    } as any);

    mockRequest.params = { id: 'u1' };
    await deleteUser(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockDelete).toHaveBeenCalledWith('u1');
    expect(responseData.status).toBe('success');
    expect(responseData.data.message).toBe('User deleted successfully');
  });

  test('createProduct should create and return product', async () => {
    const mockCreate = jest.fn<any>().mockResolvedValue({ id: 'p1', name: 'Product 1' });

    jest.spyOn(RepositoryFactory, 'getProductRepository').mockReturnValue({
      create: mockCreate
    } as any);

    mockRequest.body = { name: 'Product 1', price: 100 };
    await createProduct(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockCreate).toHaveBeenCalledWith({ name: 'Product 1', price: { amount: 100, currency: 'USD' } });
    expect(responseStatus).toBe(201);
    expect(responseData.status).toBe('success');
    expect(responseData.data.product.id).toBe('p1');
  });

  test('updateProduct should update and return product', async () => {
    const mockUpdate = jest.fn<any>().mockResolvedValue({ id: 'p1', name: 'Updated Product' });

    jest.spyOn(RepositoryFactory, 'getProductRepository').mockReturnValue({
      update: mockUpdate
    } as any);

    mockRequest.params = { id: 'p1' };
    mockRequest.body = { name: 'Updated Product', price: 200 };
    await updateProduct(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockUpdate).toHaveBeenCalledWith('p1', { name: 'Updated Product', price: { amount: 200, currency: 'USD' } });
    expect(responseData.status).toBe('success');
  });

  test('deleteProduct should delete product and return success message', async () => {
    const mockDelete = jest.fn<any>().mockResolvedValue(true);

    jest.spyOn(RepositoryFactory, 'getProductRepository').mockReturnValue({
      delete: mockDelete
    } as any);

    mockRequest.params = { id: 'p1' };
    await deleteProduct(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockDelete).toHaveBeenCalledWith('p1');
    expect(responseData.status).toBe('success');
    expect(responseData.data.message).toBe('Product deleted successfully');
  });

  test('createOrder should create and return order', async () => {
    const mockCreate = jest.fn<any>().mockResolvedValue({ id: 'o1', status: 'PENDING' });

    jest.spyOn(RepositoryFactory, 'getOrderRepository').mockReturnValue({
      create: mockCreate
    } as any);

    mockRequest.body = { items: [] };
    await createOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockCreate).toHaveBeenCalledWith({ items: [] });
    expect(responseStatus).toBe(201);
    expect(responseData.status).toBe('success');
    expect(responseData.data.order.id).toBe('o1');
  });

  test('deleteOrder should delete order and return success message', async () => {
    const mockDelete = jest.fn<any>().mockResolvedValue(true);

    jest.spyOn(RepositoryFactory, 'getOrderRepository').mockReturnValue({
      delete: mockDelete
    } as any);

    mockRequest.params = { id: 'o1' };
    await deleteOrder(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockDelete).toHaveBeenCalledWith('o1');
    expect(responseData.status).toBe('success');
    expect(responseData.data.message).toBe('Order deleted successfully');
  });

  test('modifyOrderDetails should update and return order', async () => {
    const mockUpdate = jest.fn<any>().mockResolvedValue({ id: 'o1', notes: 'Updated notes' });

    jest.spyOn(RepositoryFactory, 'getOrderRepository').mockReturnValue({
      update: mockUpdate
    } as any);

    mockRequest.params = { id: 'o1' };
    mockRequest.body = { notes: 'Updated notes' };
    await modifyOrderDetails(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockUpdate).toHaveBeenCalledWith('o1', { notes: 'Updated notes' });
    expect(responseData.status).toBe('success');
  });

  test('modifyUserProfile should strip role property from payload for privilege security', async () => {
    const mockUpdate = jest.fn<any>().mockResolvedValue({ id: 'u1', firstName: 'John' });

    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      update: mockUpdate
    } as any);

    mockRequest.params = { id: 'u1' };
    mockRequest.body = { firstName: 'John', role: 'SUPER_ADMIN' };
    await modifyUserProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockUpdate).toHaveBeenCalledWith('u1', { firstName: 'John' });
  });

  test('updatePaymentStatus should pass AppError to next when paymentStatus is missing', async () => {
    mockRequest.params = { id: 'o1' };
    mockRequest.body = {};

    await updatePaymentStatus(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
      status: 400,
      message: 'Order ID and paymentStatus are required'
    }));
  });

  test('getAllUsers should pass repository errors to next handler', async () => {
    const dbError = new Error('Database connection failed');
    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      getPaginated: jest.fn<any>().mockRejectedValue(dbError)
    } as any);

    await getAllUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(dbError);
  });

  test('getAnalyticsOverview should return analytics summary', async () => {
    const mockOrderGetPaginated = jest.fn<any>().mockResolvedValue({
      results: [{ status: 'COMPLETED', totalAmount: { amount: 100 } }, { status: 'CANCELLED', totalAmount: { amount: 50 } }],
      total: 2,
      limit: 1000,
      offset: 0
    });
    
    const mockUserGetPaginated = jest.fn<any>().mockResolvedValue({
      results: [],
      total: 5,
      limit: 1000,
      offset: 0
    });

    jest.spyOn(RepositoryFactory, 'getOrderRepository').mockReturnValue({
      getPaginated: mockOrderGetPaginated
    } as any);
    
    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      getPaginated: mockUserGetPaginated
    } as any);

    await getAnalyticsOverview(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(responseData.status).toBe('success');
    expect(responseData.data.totalRevenue).toBe(100);
    expect(responseData.data.completedOrders).toBe(1);
    expect(responseData.data.totalOrders).toBe(2);
    expect(responseData.data.totalUsers).toBe(5);
  });

  test('getLiveLockedCheckouts should return checkouts based on status query', async () => {
    const mockCheckouts = [
      {
        checkout_id: 'chk_live1',
        user_id: 'u1',
        status: 'active',
        expires_at: new Date(Date.now() + 600000).toISOString(),
        snapshot: { source_cart_version: 1, locked_items: [], locked_total: { amount: 50, currency: 'USD' } },
        createdAt: new Date()
      }
    ];

    const mockGetAllCheckouts = jest.fn<any>().mockResolvedValue(mockCheckouts);

    jest.spyOn(RepositoryFactory, 'getCheckoutRepository').mockReturnValue({
      getAllCheckouts: mockGetAllCheckouts
    } as any);

    mockRequest.query = { status: 'expired' };
    await getLiveLockedCheckouts(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockGetAllCheckouts).toHaveBeenCalledWith('expired');
    expect(responseData.status).toBe('success');
    expect(responseData.data.checkouts).toHaveLength(1);
    expect(responseData.data.checkouts[0].checkout_id).toBe('chk_live1');
  });
});

