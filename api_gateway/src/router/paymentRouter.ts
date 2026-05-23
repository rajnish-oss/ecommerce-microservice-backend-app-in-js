import express, { Request, Response } from 'express';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const packageDefinition = protoLoader.loadSync(
  path.resolve(process.cwd(), '../proto/payment.proto'),
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const PaymentServiceClient = protoDescriptor.payment.PaymentService;

const client = new PaymentServiceClient(
  process.env.PAYMENT_SERVICE_URL ?? 'payment_service:50052',
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

router.post('/products', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('CreateProduct', req.body);
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/products', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('UpdateProduct', req.body);
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/checkout', async (req: Request, res: Response) => {
  if (!req.body) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const response = await unaryCall('CreateCheckoutSession', req.body);
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
