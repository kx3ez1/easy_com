import { Router } from 'express';
import * as productController from '../controllers/product.controller.ts';

const router = Router();

router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

export { router as productRouter };
