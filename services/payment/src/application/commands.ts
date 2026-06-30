import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: process.env.PAYMENT_ENV_FILE ?? 'services/payment/.env' });
import { PrismaClient } from '../generated/prisma/client';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY for payment service');
}

const stripe = new Stripe(stripeSecretKey);

export class PaymentService {
    constructor(private readonly prisma: PrismaClient) {}

    /**
     * Called when your Catalog Service sends an event that a new product was created.
     */
    async createStripeProduct(productId: string, name: string, price: number) {
        try {
            // 1. Tell Stripe to make its own product and base price
            const product = await stripe.products.create({
                name: name,
                default_price_data: {
                    currency: 'usd',
                    unit_amount: Math.round(price * 100), // Protect against floating point issues
                },
            });

            // 2. Save the translation mapping using your internal productId
            await this.prisma.stripeData.create({
                data: {
                    productId: productId,
                    stripeProductId: product.id,
                    stripePriceId: product.default_price as string 
                }
            });

            return product;
        } catch (error) {
            console.error('Stripe Product Creation Error:', error);
            throw error;
        }
    }

    /**
     * Called when your Catalog Service updates an item.
     */
    async updateStripeProduct(productId: string, name: string, price: number) {
        // Find mapping via your internal ID, not the mutable string name
        const mapping = await this.prisma.stripeData.findUnique({
            where: { productId: productId }
        });

        if (!mapping) throw new Error(`Product mapping not found for ID: ${productId}`);

        try {
            // 1. Create a NEW price object (Stripe prices are immutable)
            const stripePrice = await stripe.prices.create({
                product: mapping.stripeProductId,
                unit_amount: Math.round(price * 100),
                currency: 'usd',
            });

            // 2. Update the product title and update its default price reference on Stripe
            const updatedProduct = await stripe.products.update(mapping.stripeProductId, {
                name: name,
                default_price: stripePrice.id,
            });

            // 3. Sync your local map to use the brand new Price ID for upcoming checkouts
            await this.prisma.stripeData.update({
                where: { productId: productId },
                data: { stripePriceId: stripePrice.id }
            });

            return updatedProduct;
        } catch (error) {
            console.error('Stripe Product Update Error:', error);
            throw error;
        }
    }

    async deleteStripeProduct(productId: string) {
        // Find mapping via your internal ID, not the mutable string name
        const mapping = await this.prisma.stripeData.findUnique({
            where: { productId: productId }
        });

        if (!mapping) throw new Error(`Product mapping not found for ID: ${productId}`);

        try{
            await stripe.products.del(mapping.stripeProductId);
            await this.prisma.stripeData.delete({
                where: { productId: productId }
            });
        } catch (error) {
            console.error('Stripe Product Deletion Error:', error);
            throw error;
        }

        return true;
    }

    async createStripeSession(productId: string, quantity: number, userId: string, orderId: string) {
        const mapping = await this.prisma.stripeData.findUnique({
            where: { productId: productId }
        });

        if (!mapping?.stripePriceId) {
            throw new Error(`Stripe Price configuration missing for product ID: ${productId}`);
        }

        const session = await stripe.checkout.sessions.create({
            success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://example.com/cancel',
            client_reference_id: userId, 
            metadata: {
                orderId: orderId,
                userId: userId,
                productId: productId
            },
            line_items: [
                {
                    price: mapping.stripePriceId,
                    quantity: quantity,
                },
            ],
            mode: 'payment',
        });

        return { url: session.url };
    }

    
    async createRefund(orderId: string) {
        // 1. Pull the payment intent token out of your transaction ledger table
        const transaction = await this.prisma.transaction.findUnique({
            where: { orderId: orderId }
        });

        if(!transaction || !transaction.stripePaymentIntentId){
            throw new Error(`Cannot issue refund. No successful transaction ledger found for order: ${orderId}`);
        }

        try {
            const refund = await stripe.refunds.create({
                payment_intent: transaction.stripePaymentIntentId,
            });

            // 3. Mark the ledger line item as settled/refunded
            await this.prisma.transaction.update({
                where: { orderId: orderId },
                data: { status: 'REFUNDED' }
            });

            return refund;
        } catch (error) {
            console.error('Stripe Refund Processing Error:', error);
            throw error;
        }
    }
}
