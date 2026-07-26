import { Router } from 'express';
import * as checkoutController from '../controllers/checkout.controller.ts';

const router = Router();

router.post('/init', checkoutController.initCheckout);
router.get('/:checkout_id', checkoutController.getCheckout);

export { router as checkoutRouter };
