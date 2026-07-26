import type { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import type { UserProfile } from '../models/types/user.types.ts';

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
  userProfile?: UserProfile;
}

export const checkAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'Access denied. Token is missing.');
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = decodedToken;

    if (!req.user || !req.user.uid) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'Access denied. User UID not found.');
    }

    console.log('user details', req.user)
    next();
  } catch (error: any) {
    next(new AppError(401, StatusCodes.UNAUTHORIZED, error.message || 'Invalid token.'));
  }
};

export const syncUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || !req.user.uid) {
      throw new AppError(401, StatusCodes.UNAUTHORIZED, 'Access denied. User UID not found.');
    }

    const userProfileRepo = RepositoryFactory.getUserProfileRepository();
    let profile = await userProfileRepo.getByUid(req.user.uid);

    if (!profile) {
      // Automatically create a profile
      profile = await userProfileRepo.create({
        uid: req.user.uid,
        email: req.user.email || '',
        firstName: req.user.name ? req.user.name.split(' ')[0] : undefined,
        lastName: req.user.name ? req.user.name.split(' ').slice(1).join(' ') : undefined,
        lastLogin: new Date(),
      });
    } else {
      // Update lastLogin timestamp
      profile = await userProfileRepo.update(profile.id, {
        lastLogin: new Date(),
      });
    }

    req.userProfile = profile;
    next();
  } catch (error: any) {
    next(new AppError(500, StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Error syncing user profile.'));
  }
};
