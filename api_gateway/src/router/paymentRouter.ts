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

function unaryCall(method: string, payload: any): Promise<any> {
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

router.delete('/products/delete/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const response = await unaryCall('DeleteProduct', { productId });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
})

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

router.post('/checkout/refund/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    const response = await unaryCall('CreateRefund', { orderId });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig || typeof sig !== 'string') {
    return res.status(400).send('Missing or invalid stripe-signature header');
  }

  // CRITICAL: Ensure express.raw() middleware was used for this route so req.body is a Buffer
  if (!Buffer.isBuffer(req.body)) {
    console.error('API Gateway Error: req.body is not a raw Buffer. Stripe verification will fail.');
    return res.status(500).send('Internal Gateway Configuration Error');
  }

  try {
    // 1. Build the plain JS object that maps perfectly to your protobuf message definition fields
    const payload = {
      stripe_signature: sig, // Matches fields in payment.proto
      raw_body: req.body,    // This raw buffer will be marshaled cleanly to gRPC 'bytes'
    };

    // 2. Fire the call through your unary wrapper to cleanly await the response
    const response = await unaryCall('HandleStripeWebhook', payload);

    const statusCode = response.http_status_code || 200;

    // 3. Relay the internal service status back to Stripe
    if (response.success) {
      return res.status(statusCode).json({ received: true });
    } else {
      console.error(`Payment Service failed to process webhook: ${response.message}`);
      return res.status(statusCode).send(response.message || 'Webhook processing failed');
    }

  } catch (error: any) {
    console.error(`gRPC communication failure to Payment Service: ${error.message}`);
    // A 500 status tells Stripe to keep trying to deliver this webhook event
    return res.status(500).send('Internal Microservice Communication Failure');
  }
});

export default router;
