import type { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';
import { RepositoryFactory } from '../models/repositories/repository.factory.ts';
import { findProductBySku, createPendingOrder } from '../services/order.service.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // DEBUG
    // delay of 40 seconds for testing/simulation
    await new Promise(resolve => setTimeout(resolve, 40000));

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in the environment variables');
    }
    const stripe = new Stripe(apiKey);

    const { checkout_id } = req.body;
    if (!checkout_id) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'checkout_id is required');
    }

    const checkoutRepo = RepositoryFactory.getCheckoutRepository();
    const checkout = await checkoutRepo.getById(checkout_id);
    if (!checkout) {
      throw new AppError(404, StatusCodes.NOT_FOUND, `Checkout session ${checkout_id} not found`);
    }

    const userId = (req as any).userProfile?.id;
    if (!userId || checkout.user_id !== userId) {
      throw new AppError(403, StatusCodes.FORBIDDEN, 'Unauthorized access to this checkout session');
    }

    // Call createPendingOrder to validate checkout status/expiry, inventory, and create the pending order
    const pendingOrder = await createPendingOrder(userId, checkout_id);

    const line_items = [];
    for (const item of checkout.snapshot.locked_items) {
      const skuInfo = await findProductBySku(item.sku);
      const name = skuInfo ? skuInfo.name : `Product ${item.sku}`;

      line_items.push({
        price_data: {
          currency: checkout.snapshot.locked_total.currency?.toLowerCase() || 'usd',
          product_data: {
            name,
            metadata: {
              sku: item.sku
            }
          },
          unit_amount: Math.round(item.locked_price.amount * 100),
        },
        quantity: item.qty,
      });
    }

    if (line_items.length === 0) {
      throw new AppError(400, StatusCodes.BAD_REQUEST, 'Checkout session has no items');
    }

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/api/v1/payments/stripe/success`,
      cancel_url: `${req.protocol}://${req.get('host')}/api/v1/payments/stripe/cancel`,
    });

    if (session.url) {
      res.json({ url: session.url, order_id: pendingOrder.id });
    } else {
      res.status(500).json({ error: 'Failed to create stripe checkout session URL' });
    }
  } catch (error) {
    next(error);
  }
}

export async function stripeSuccess(req: Request, res: Response): Promise<void> {
  res.sendFile(path.join(__dirname, '../views/stripe_success.html'));
}

export async function stripeCancel(req: Request, res: Response): Promise<void> {
  res.sendFile(path.join(__dirname, '../views/stripe_cancel.html'));
}

export async function stripeWebhook(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    console.error('STRIPE_SECRET_KEY is not defined in the environment variables');
    res.status(500).send('Stripe API key not configured');
    return;
  }
  const stripe = new Stripe(apiKey);

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  if (endpointSecret) {
    const signature = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature as string,
        endpointSecret
      );
    } catch (err: any) {
      console.log(`⚠️ Webhook signature verification failed.`, err.message);
      res.sendStatus(400);
      return;
    }
  }

  if (event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        // const paymentIntent = event.data.object;
        break;
      case 'payment_method.attached':
        // const paymentMethod = event.data.object;
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  res.json({ received: true });
}

