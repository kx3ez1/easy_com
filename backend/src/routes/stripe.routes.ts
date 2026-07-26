import { Router } from 'express';
import express from 'express';
import * as stripeController from '../controllers/stripe.controller.ts';

const router = Router();

router.post('/create-checkout-session', stripeController.createCheckoutSession);
router.get('/success', stripeController.stripeSuccess);
router.get('/cancel', stripeController.stripeCancel);




const webhookSecretPath = process.env.STRIPE_WEBHOOK_SECRET_PATH;
if (!webhookSecretPath) {
  console.warn('Warning: STRIPE_WEBHOOK_SECRET_PATH is empty or not defined. Using "default_secret" fallback.');
}
const pathSuffix = webhookSecretPath || 'default_secret';

// Use express.raw for the raw body verification in the webhook
router.post(
  `/webhook_${pathSuffix}`,
  express.raw({ type: 'application/json' }),
  stripeController.stripeWebhook
);

export { router as stripeRouter };
