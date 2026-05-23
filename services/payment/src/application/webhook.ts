import { Request, Response } from 'express';
import Stripe from 'stripe';
import { orderClient } from '../infra/orderClient';
import {Kafka} from 'kafkajs';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const kafka = new Kafka({ clientId: 'payment-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

await producer.connect();

export const handleStripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature']!;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orderId, userId } = session.metadata || {};

        // STEP 1: Synchronous gRPC call to Order Service
        orderClient.updateStatus({ userId,productId: orderId, status: 'PAID' }, async (err, response) => {
            if (err || !response.success) {
                console.error("Critical: Failed to update order status via gRPC");
                // Stripe will retry the webhook later if we return a non-200
                return res.status(500).send("Internal Server Error");
            }

            // STEP 2: Asynchronous Kafka Event for downstream services
            await producer.send({
                topic: 'payment-events',
                messages: [
                    { 
                        key: orderId, 
                        value: JSON.stringify({
                            type: 'PAYMENT_SUCCESS',
                            orderId,
                            userId,
                            amount: session.amount_total,
                            timestamp: new Date().toISOString()
                        }) 
                    }
                ]
            });

            console.log(`Order ${orderId} finalized and event broadcasted.`);
            res.json({ received: true });
        });
    } else {
        res.json({ received: true });
    }
};