import type { Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';
import type { AuthenticatedRequest } from './auth.middleware.ts';

export const checkAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userProfile) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'Access denied. User profile missing.');
    }

    if (req.userProfile.role !== 'ADMIN') {
      throw new AppError(403, StatusCodes.FORBIDDEN, 'Access denied. Administrator privileges required.');
    }

    next();
  } catch (error: any) {
    next(error);
  }
};
