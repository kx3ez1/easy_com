import { Router } from "express";
import { productRouter } from "./product.routes.ts";
import { orderRouter } from "./order.routes.ts";
import { paymentsRouter } from "./payments.routes.ts";
import { cartRouter } from "./cart.routes.ts";
import { checkoutRouter } from "./checkout.routes.ts";
import { userRouter } from "./user.routes.ts";
import { sendSuccess } from "../utils/response.ts";

const apiv1 = Router();

apiv1.get('/', function (req, res) {
    sendSuccess(res, { message: 'Hello from APIv1 root route.' });
});

apiv1.use('/products/', productRouter);
apiv1.use('/orders', orderRouter);
apiv1.use('/payments', paymentsRouter);
apiv1.use('/cart', cartRouter);
apiv1.use('/checkout', checkoutRouter);
apiv1.use('/users', userRouter);

export { apiv1 };