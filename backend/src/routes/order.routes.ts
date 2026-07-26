import { Router } from 'express';
import * as orderController from '../controllers/order.controller.ts';

const router = Router();

router.post('/', orderController.placeOrder);
router.get('/', orderController.listOrders);

export { router as orderRouter };
