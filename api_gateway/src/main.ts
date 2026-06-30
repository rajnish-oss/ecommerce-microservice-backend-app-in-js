import path from 'path';
import express from 'express';
import session from 'express-session';
import userRouter  from './router/userRouter';
import inventoryRouter from './router/inventoryRouter';
import cartRouter from './router/cartRouter';
import productCatRouter from './router/productCatRouter';
import orderRouter from './router/orderRouter';
import paymentRouter from './router/paymentRouter';
import { authMiddleware } from './middlewares/authMiddleware';

const app = express();

app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/user', userRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/cart', cartRouter)
app.use('/api/product-cat',authMiddleware, productCatRouter)
app.use('/api/order', orderRouter)
app.use('/api/payment', paymentRouter)

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
	console.log(`API Gateway listening on port ${port}`);
});


