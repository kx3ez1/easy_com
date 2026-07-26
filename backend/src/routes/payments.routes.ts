import { Router } from 'express';
import { stripeRouter } from './stripe.routes.ts';
import { paypalRouter } from './paypal.routes.ts';
const router = Router();

// Mount individual gateways
router.use('/stripe', stripeRouter);

// TODO: pending
router.use('/paypal', paypalRouter);

export { router as paymentsRouter };
