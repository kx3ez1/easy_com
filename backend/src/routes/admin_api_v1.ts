import { Router } from 'express';
import {
  getAllUsers,
  getAllProducts,
  getAllOrders,
  updateOrderStatus,
  updatePaymentStatus,
  modifyOrderDetails,
  getAnalyticsOverview,
  modifyUserProfile,
  deleteUser,
  createProduct,
  updateProduct,
  deleteProduct,
  createOrder,
  deleteOrder,
  getLiveLockedCheckouts
} from '../controllers/admin.controller.ts';

const adminApiV1 = Router();

// Users
adminApiV1.get('/users', getAllUsers);
adminApiV1.post('/users/:id', modifyUserProfile);
adminApiV1.post('/users/:id/delete', deleteUser);

// Products
adminApiV1.get('/products', getAllProducts);
adminApiV1.post('/products', createProduct);
adminApiV1.post('/products/:id', updateProduct);
adminApiV1.post('/products/:id/delete', deleteProduct);

// Orders
adminApiV1.get('/orders', getAllOrders);
adminApiV1.post('/orders', createOrder);
adminApiV1.post('/orders/:id/delete', deleteOrder);
adminApiV1.post('/orders/:id/status', updateOrderStatus);
adminApiV1.post('/orders/:id/payment', updatePaymentStatus);
adminApiV1.post('/orders/:id', modifyOrderDetails);

// Checkouts
adminApiV1.get('/checkouts/live-locked', getLiveLockedCheckouts);

// Analytics
adminApiV1.get('/analytics', getAnalyticsOverview);

export { adminApiV1 };
