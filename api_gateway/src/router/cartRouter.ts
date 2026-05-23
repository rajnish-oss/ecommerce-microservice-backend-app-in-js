import express, { Request, Response } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const packageDefinition = protoLoader.loadSync(
	path.resolve(process.cwd(), '../proto/cart.proto'),
	{
		keepCase: true,
		longs: String,
		enums: String,
		defaults: true,
		oneofs: true,
	}
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const CartServiceClient = protoDescriptor.cart.CartService;

const client = new CartServiceClient(
	process.env.CART_SERVICE_URL ?? 'cart_service:50054',
	grpc.credentials.createInsecure()
);

const router = express.Router();

router.post('/items', async (req: Request, res: Response) => {
	if (!req.body) {
		return res.status(400).json({ message: 'Invalid request' });
	}

	try {
		const response = await new Promise((resolve, reject) => {
			client.AddItem(req.body, (err: any, result: any) => {
				if (err) {
					reject(err);
					return;
				}

				resolve(result);
			});
		});

		return res.json(response);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
});

router.delete('/items', async (req: Request, res: Response) => {
	if (!req.body) {
		return res.status(400).json({ message: 'Invalid request' });
	}

	try {
		const response = await new Promise((resolve, reject) => {
			client.RemoveItem(req.body, (err: any, result: any) => {
				if (err) {
					reject(err);
					return;
				}

				resolve(result);
			});
		});

		return res.json(response);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
});

router.get('/total/:userId', async (req: Request, res: Response) => {
	const userId = Number(req.params.userId);

	if (Number.isNaN(userId)) {
		return res.status(400).json({ message: 'Invalid userId' });
	}

	try {
		const response = await new Promise((resolve, reject) => {
			client.TotalSum({ user_id: userId }, (err: any, result: any) => {
				if (err) {
					reject(err);
					return;
				}

				resolve(result);
			});
		});

		return res.json(response);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
});

router.get('/:userId', async (req: Request, res: Response) => {
	const userId = Number(req.params.userId);

	if (Number.isNaN(userId)) {
		return res.status(400).json({ message: 'Invalid userId' });
	}

	try {
		const response = await new Promise((resolve, reject) => {
			client.GetCart({ user_id: userId }, (err: any, result: any) => {
				if (err) {
					reject(err);
					return;
				}

				resolve(result);
			});
		});

		return res.json(response);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
});

export default router;
