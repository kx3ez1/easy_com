import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import { getProfile, updateProfile, addAddress, deleteAddress, setDefaultAddress } from './user.controller.ts';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';

describe('UserController Unit Tests', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let responseData: any;
  let responseStatus: number;

  beforeEach(() => {
    responseData = null;
    responseStatus = 200;
    mockRequest = {
      userProfile: {
        id: 'user-123',
        uid: 'uid-123',
        email: 'test@example.com',
        role: 'CUSTOMER',
        firstName: 'Test',
        lastName: 'User',
        addresses: [],
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

  test('getProfile should return profile data', async () => {
    await getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
    expect(responseData).toBeDefined();
    expect(responseData.status).toBe('success');
    expect(responseData.data.profile.id).toBe('user-123');
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('getProfile should call next with error if profile is missing', async () => {
    delete mockRequest.userProfile;
    await getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  test('updateProfile should update and return profile data', async () => {
    const mockUpdate = (jest.fn() as any).mockResolvedValue({
      id: 'user-123',
      firstName: 'UpdatedName'
    });

    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      update: mockUpdate
    } as any);

    mockRequest.body = { firstName: 'UpdatedName' };
    await updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockUpdate).toHaveBeenCalledWith('user-123', { firstName: 'UpdatedName' });
    expect(responseData.data.profile.firstName).toBe('UpdatedName');
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('addAddress should add address and return updated profile', async () => {
    const mockAddAddr = (jest.fn() as any).mockResolvedValue({
      id: 'user-123',
      addresses: [{ id: 'addr-1', label: 'Home' }]
    });

    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      addAddress: mockAddAddr
    } as any);

    mockRequest.body = { label: 'Home', city: 'NYC' };
    await addAddress(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockAddAddr).toHaveBeenCalledWith('user-123', { label: 'Home', city: 'NYC' });
    expect(responseData.data.profile.addresses).toHaveLength(1);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('deleteAddress should remove address and return updated profile', async () => {
    const mockRemoveAddr = (jest.fn() as any).mockResolvedValue({
      id: 'user-123',
      addresses: []
    });

    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      removeAddress: mockRemoveAddr
    } as any);

    mockRequest.params = { addressId: 'addr-1' };
    await deleteAddress(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockRemoveAddr).toHaveBeenCalledWith('user-123', 'addr-1');
    expect(responseData.data.profile.addresses).toHaveLength(0);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('setDefaultAddress should update default address type', async () => {
    const mockSetDefaultAddr = (jest.fn() as any).mockResolvedValue({
      id: 'user-123',
      addresses: [{ id: 'addr-1', isDefaultShipping: true }]
    });

    jest.spyOn(RepositoryFactory, 'getUserProfileRepository').mockReturnValue({
      setDefaultAddress: mockSetDefaultAddr
    } as any);

    mockRequest.params = { addressId: 'addr-1' };
    mockRequest.body = { type: 'shipping' };
    await setDefaultAddress(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

    expect(mockSetDefaultAddr).toHaveBeenCalledWith('user-123', 'addr-1', 'shipping');
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('setDefaultAddress should error for invalid type', async () => {
    mockRequest.params = { addressId: 'addr-1' };
    mockRequest.body = { type: 'invalid' };
    await setDefaultAddress(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
