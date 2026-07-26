import { Router } from 'express';
import * as cartController from '../controllers/cart.controller.ts';

const router = Router();

router.get('/', cartController.getCart);
router.post('/', cartController.updateCart);

export { router as cartRouter };
