import type { Request, Response, NextFunction } from 'express';
import * as productService from '../services/product.service.ts';
import { sendSuccess } from '../utils/response.ts';
import { AppError } from '../utils/AppError.ts';
import { StatusCodes } from '../constants/statusCodes.ts';

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await productService.getAllProducts({
      ...(category !== undefined ? { categorySlug: category } : {}),
      ...(search !== undefined ? { searchQuery: search } : {}),
      limit,
      offset
    });
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = req.params.id;
    if (typeof productId !== 'string' || !productId.trim()) {
      throw new AppError(400, StatusCodes.INVALID_PRODUCT_ID, 'Product ID is required and must be a string');
    }
    const product = await productService.getProductById(productId);

    if (!product) {
      throw new AppError(404, StatusCodes.PRODUCT_NOT_FOUND, 'Product not found');
    }

    sendSuccess(res, { product });
  } catch (error) {
    next(error);
  }
}

