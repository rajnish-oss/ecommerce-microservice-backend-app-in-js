import Stripe from 'stripe';
import { orderClient } from '../infra/orderClient';
import { Kafka } from 'kafkajs';
import { prisma } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const kafkaBrokers = (process.env.KAFKA_BROKERS ?? 'kafka:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID ?? 'payment-service',
    brokers: kafkaBrokers
});
const producer = kafka.producer();
let producerConnected = false;

const ensureProducerConnected = async () => {
    if (!producerConnected) {
        await producer.connect();
        producerConnected = true;
    }
};

// Helper to promisify the gRPC status update
const updateOrderStatusAsync = (userId: string, productId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        orderClient.UpdateStatus({
            orderDetail: {
                userId: Number(userId),
                productId: Number(productId),
                status: 'COMPLETED'
            }
        }, (err: any, response: any) => {
            if (err) return reject(err);
            if (!response) return reject(new Error('Order service returned an empty response'));
            resolve(response);
        });
    });
};

export const handleStripeWebhook = async (call: any) => {

    const sig = call.stripe_signature;
    if (!sig) {
        return {
            success: false,
            message: 'Missing Stripe Signature',
            http_status_code: 400
        };
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(call.raw_body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return {
            success: false,
            message: `Webhook Signature Verification Failed: ${err.message}`,
            http_status_code: 400 // Tell gateway to reply to Stripe with a 400
        };
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const { orderId, userId, productId } = session.metadata || {};

        
        if (!orderId || !userId || !productId) {
            console.error('Missing orderId, userId, or productId in session metadata');
            return {
                success: false,
                message: 'Missing metadata credentials (orderId, userId, or productId) in Stripe Session',
                http_status_code: 400
            };
        }
        
        if(!session.payment_intent || session.amount_total == null || !session.currency) {
            console.error('Missing payment_intent in Stripe Session');
            return {
                success: false,
                message: 'Missing payment_intent in Stripe Session',
                http_status_code: 400
            };
        }

        await prisma.transaction.upsert({
            where: { orderId },
            update: {
                stripePaymentIntentId: session.payment_intent as string,
                stripeCheckoutSessionId: session.id,
                amountInCents: session.amount_total,
                currency: session.currency.toUpperCase(),
                status: 'COMPLETED'
            },
            create: {
                userId: userId,
                orderId: orderId,
                stripePaymentIntentId: session.payment_intent as string,
                stripeCheckoutSessionId: session.id,
                amountInCents: session.amount_total,
                currency: session.currency.toUpperCase(),
                status: 'COMPLETED'
            }
        });

        try {
            // STEP 1: Synchronous gRPC call converted to awaitable promise
            await updateOrderStatusAsync(userId, productId);

            // STEP 2: Asynchronous Kafka Event for downstream services
            await ensureProducerConnected();
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

            return {
                success: true,
                message: 'Webhook processed, downstream dependencies updated successfully.',
                http_status_code: 200
            };

        } catch (error: any) {
            console.error(`Critical operational failure handling webhook for order ${orderId}:`, error);
            // Returning a 500 tells Stripe to retry sending this webhook event later
            return {
                success: false,
                message: `Internal processing error: ${error.message}`,
                http_status_code: 500
            };
        }
    }

    // Acknowledge other event types we don't handle
    return {
        success: true,
        message: `Event type ${event.type} acknowledged without action.`,
        http_status_code: 200
    };
};
