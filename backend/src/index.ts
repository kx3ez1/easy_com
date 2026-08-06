import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { apiv1 as API_V1 } from './routes/api_v1.ts';
import { errorHandler } from './middlewares/error.middleware.ts';
import { sendSuccess } from './utils/response.ts';
import { AppError } from './utils/AppError.ts';
import { StatusCodes } from './constants/statusCodes.ts';

import * as firebase_admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { checkAuth, syncUserProfile } from './middlewares/auth.middleware.ts';
import { checkAdmin } from './middlewares/admin.middleware.ts';
import { adminApiV1 } from './routes/admin_api_v1.ts';

// Load environment variables from your .env file
dotenv.config();

try {
  const serviceAccountPath = path.resolve('e-commerce-34ab7-firebase-adminsdk-fbsvc-c706bd32ea.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  firebase_admin.initializeApp({
    credential: firebase_admin.cert(serviceAccount)
  });
} catch (error) {
  console.log(error)
}


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the public folder
app.use(express.static('public'));

app.use('/api/v1', checkAuth, syncUserProfile, API_V1)
app.use('/api/admin/v1', checkAuth, syncUserProfile, checkAdmin, adminApiV1);

// Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
  sendSuccess(res, { status: 'healthy' });
});

// Fallback for unmatched routes
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(404, StatusCodes.ROUTE_NOT_FOUND, `Route ${req.method} ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`[server]: Server running on http://localhost:${PORT}`);
});