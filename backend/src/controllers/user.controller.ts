import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.ts';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import { sendSuccess } from '../utils/response.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';
import { Sanitizer } from '../utils/sanitizer.ts';

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

    const updates: Record<string, any> = {};

    // 1. Sanitize & validate firstName if provided
    if (req.body.firstName !== undefined) {
      const result = Sanitizer.validateName(req.body.firstName, 'First Name', { required: true });
      if (!result.isValid) {
        throw new AppError(400, StatusCodes.BAD_REQUEST, result.error || 'First Name is required');
      }
      updates.firstName = result.sanitized;
    }

    // 2. Sanitize & validate lastName if provided
    if (req.body.lastName !== undefined) {
      const result = Sanitizer.validateName(req.body.lastName, 'Last Name', { required: false });
      if (!result.isValid) {
        throw new AppError(400, StatusCodes.BAD_REQUEST, result.error || 'Last Name contains invalid characters');
      }
      updates.lastName = result.sanitized;
    }

    // 3. Sanitize & validate phoneNumber if provided
    if (req.body.phoneNumber !== undefined) {
      const result = Sanitizer.validatePhone(req.body.phoneNumber, false);
      if (!result.isValid) {
        throw new AppError(400, StatusCodes.BAD_REQUEST, result.error || 'Invalid phone number');
      }
      updates.phoneNumber = result.sanitized;
    }

    const userProfileRepo = RepositoryFactory.getUserProfileRepository();
    const updated = await userProfileRepo.update(profile.id, updates);
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
    const labelResult = Sanitizer.validateAddressLabel(req.body.label);
    if (!labelResult.isValid) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, labelResult.error || 'Invalid address label');
    }
    const addressData = { ...req.body, label: labelResult.sanitized };
    const userProfileRepo = RepositoryFactory.getUserProfileRepository();
    const updated = await userProfileRepo.addAddress(profile.id, addressData);
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

export async function updateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = req.userProfile;
    if (!profile) {
      throw new AppError(404, StatusCodes.NOT_FOUND, 'User profile not found');
    }
    const { addressId } = req.params;
    if (!addressId || typeof addressId !== 'string') {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'addressId is required and must be a string');
    }
    const addressData = { ...req.body };
    if (req.body.label !== undefined) {
      const labelResult = Sanitizer.validateAddressLabel(req.body.label);
      if (!labelResult.isValid) {
        throw new AppError(400, StatusCodes.BAD_REQUEST, labelResult.error || 'Invalid address label');
      }
      addressData.label = labelResult.sanitized;
    }
    const userProfileRepo = RepositoryFactory.getUserProfileRepository();
    const updated = await userProfileRepo.updateAddress(profile.id, addressId, addressData);
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
