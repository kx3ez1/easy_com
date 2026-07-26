import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const router = Router();

// Endpoint for PayPal Checkout Simulation
router.post('/create-order', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In a real PayPal integration, you would call PayPal's Orders API here.
    // For this simulation, we generate a mock approval URL.
    const mockPaypalApprovalUrl = `${req.protocol}://${req.get('host')}/api/v1/payments/paypal/success`;

    // Redirect to the success redirect route to complete payment simulator
    res.redirect(303, mockPaypalApprovalUrl);
  } catch (error) {
    next(error);
  }
});


router.get('/success', async (req: Request, res: Response): Promise<void> => {
  res.sendFile(path.join(__dirname, '../views/paypal_success.html'));
});

router.get('/cancel', async (req: Request, res: Response): Promise<void> => {
  res.sendFile(path.join(__dirname, '../views/paypal_cancel.html'));
});

export { router as paypalRouter };
