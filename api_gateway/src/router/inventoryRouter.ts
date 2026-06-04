import express, { Request, Response } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const packageDefinition = protoLoader.loadSync(
	path.resolve(process.cwd(), '../proto/inventory.proto'),
	{
		keepCase: true,
		longs: String,
		enums: String,
		defaults: true,
		oneofs: true,
	}
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const InventoryServiceClient = protoDescriptor.inventory.InventoryService;

const client = new InventoryServiceClient(
	process.env.INVENTORY_SERVICE_URL ?? 'inventory_service:50059',
	grpc.credentials.createInsecure()
);

const router = express.Router();

router.post('/add-product', async (req: Request, res: Response) => {
	if (!req.body) {
		return res.status(400).json({ message: 'Invalid request' });
	}

	try {
		const response = await new Promise((resolve, reject) => {
			client.AddProduct(req.body, (err: any, result: any) => {
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

router.put('/update-product', async (req: Request, res: Response) => {
	if (!req.body) {
		return res.status(400).json({ message: 'Invalid request' });
	}

	try {
		const response = await new Promise((resolve, reject) => {
			client.UpdateProduct(req.body, (err: any, result: any) => {
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

router.post('/reserve-stock', async (req: Request, res: Response) => {
	if (!req.body) {
		return res.status(400).json({ message: 'Invalid request' });
	}

	try {
		const response = await new Promise((resolve, reject) => {
			client.ReserveStock(req.body, (err: any, result: any) => {
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

router.get('/low-stock/:threshold', async (req: Request, res: Response) => {
	const threshold = Number(req.params.threshold);

	if (Number.isNaN(threshold)) {
		return res.status(400).json({ message: 'Invalid threshold' });
	}

	try {
		const response = await new Promise((resolve, reject) => {
			client.GetLowStockProducts({ threshold }, (err: any, result: any) => {
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
