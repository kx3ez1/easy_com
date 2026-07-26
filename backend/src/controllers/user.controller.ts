import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import { sendSuccess } from '../utils/response.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';

export async function getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.userProfile) {
      throw new AppError(404, StatusCodes.NOT_FOUND, 'User profile not found');
    }
    sendSuccess(res, { profile: req.userProfile });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = req.userProfile;
    if (!profile) {
      throw new AppError(404, StatusCodes.NOT_FOUND, 'User profile not found');
    }
    const userProfileRepo = RepositoryFactory.getUserProfileRepository();
    const updated = await userProfileRepo.update(profile.id, req.body);
    sendSuccess(res, { profile: updated });
  } catch (error) {
    next(error);
  }
}

export async function addAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = req.userProfile;
    if (!profile) {
      throw new AppError(404, StatusCodes.NOT_FOUND, 'User profile not found');
    }
    const userProfileRepo = RepositoryFactory.getUserProfileRepository();
    const updated = await userProfileRepo.addAddress(profile.id, req.body);
    sendSuccess(res, { profile: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = req.userProfile;
    if (!profile) {
      throw new AppError(404, StatusCodes.NOT_FOUND, 'User profile not found');
    }
    const { addressId } = req.params;
    if (!addressId || typeof addressId !== 'string') {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'addressId is required and must be a string');
    }
    const userProfileRepo = RepositoryFactory.getUserProfileRepository();
    const updated = await userProfileRepo.removeAddress(profile.id, addressId);
    sendSuccess(res, { profile: updated });
  } catch (error) {
    next(error);
  }
}

export async function setDefaultAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = req.userProfile;
    if (!profile) {
      throw new AppError(404, StatusCodes.NOT_FOUND, 'User profile not found');
    }
    const { addressId } = req.params;
    if (!addressId || typeof addressId !== 'string') {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'addressId is required and must be a string');
    }
    const { type } = req.body; // 'shipping' | 'billing'
    if (type !== 'shipping' && type !== 'billing') {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'Type must be "shipping" or "billing"');
    }
    const userProfileRepo = RepositoryFactory.getUserProfileRepository();
    const updated = await userProfileRepo.setDefaultAddress(profile.id, addressId, type);
    sendSuccess(res, { profile: updated });
  } catch (error) {
    next(error);
  }
}
