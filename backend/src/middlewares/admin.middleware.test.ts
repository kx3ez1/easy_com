import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { Response, NextFunction } from 'express';
import { checkAdmin } from './admin.middleware.ts';
import type { AuthenticatedRequest } from './auth.middleware.ts';

describe('AdminMiddleware Unit Tests', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    mockNext = jest.fn() as any;
  });

  test('should call next if user is ADMIN', async () => {
    mockRequest.userProfile = {
      id: 'admin-123',
      uid: 'uid',
      email: 'admin@admin.com',
      role: 'ADMIN',
      createdAt: new Date()
    };

    await checkAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(); // Called without errors
  });

  test('should call next with error if user profile is missing', async () => {
    await checkAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('User profile missing') }));
  });

  test('should call next with error if user is not ADMIN', async () => {
    mockRequest.userProfile = {
      id: 'cust-123',
      uid: 'uid',
      email: 'cust@cust.com',
      role: 'CUSTOMER',
      createdAt: new Date()
    };

    await checkAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Administrator privileges required') }));
  });
});
