import express, { Request, Response } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const packageDefinition = protoLoader.loadSync(
  path.resolve(process.cwd(), '../proto/order.proto'),
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const OrderServiceClient = protoDescriptor.order.OrderService;

const client = new OrderServiceClient(
  'order-service:50058',
  grpc.credentials.createInsecure()
);

const router = express.Router();

function unaryCall(method: string, payload: any) {
  return new Promise((resolve, reject) => {
    client[method](payload, (err: any, response: any) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(response);
    });
  });
}

router.post('/', async (req: Request, res: Response) => {
  const orderDetail = req.body?.orderDetail ?? req.body;

  if (!orderDetail) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('CreateOrder', { orderDetail });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch('/status', async (req: Request, res: Response) => {
  const orderDetail = req.body?.orderDetail ?? req.body;

  if (!orderDetail) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('UpdateStatus', { orderDetail });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/:orderId', async (req: Request, res: Response) => {
  const orderId = Number(req.params.orderId);

  if (Number.isNaN(orderId)) {
    return res.status(400).json({ message: 'Invalid orderId' });
  }

  try {
    const response = await unaryCall('GetOrder', { orderId });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/', async (req: Request, res: Response) => {
  const orderDetail = req.body?.orderDetail ?? req.body;

  if (!orderDetail) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('DeleteOrder', { orderDetail });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
