import { Router } from 'express';
import * as userController from '../controllers/user.controller.ts';

const router = Router();

router.get('/me', userController.getProfile);
router.post('/me', userController.updateProfile);
router.post('/me/addresses', userController.addAddress);
router.post('/me/addresses/:addressId', userController.deleteAddress);
router.post('/me/addresses/:addressId/default', userController.setDefaultAddress);

export { router as userRouter };
