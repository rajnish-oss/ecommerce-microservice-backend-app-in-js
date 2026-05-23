import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: process.env.PAYMENT_ENV_FILE ?? 'services/payment/.env' });
import { PrismaClient } from '../generated/prisma/client';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY for payment service');
}

const stripe = new Stripe(stripeSecretKey)


export class PaymentService {
    constructor(private readonly prisma: PrismaClient) {}

    async createStripeProduct(name: string, price: number) {
        try {
            // 1. Use the SDK instead of Axios
            const product = await stripe.products.create({
                name: name,
                default_price_data: {
                    currency: 'usd',
                    unit_amount: price * 100,
                },
            });

            // 2. Save to DB (Ensure your schema matches these fields)
            await this.prisma.stripeData.create({
                data: {
                    id: product.id,
                    name: name,
                    priceId: product.default_price as string 
                }
            });

            return product;
        } catch (error) {
            console.error('Stripe Product Creation Error:', error);
            throw error;
        }
    }

    async updateStripeProduct(name: string, newPrice: number) {
        const localProduct = await this.prisma.stripeData.findFirst({
            where: { name: name }
        });

        if (!localProduct) throw new Error("Product not found in database");

        try {
            // 1. Create a NEW price object (Prices are immutable)
            const price = await stripe.prices.create({
                product: localProduct.id,
                unit_amount: newPrice * 100,
                currency: 'usd',
            });

            // 2. Update the product to use this new price as the default
            const updatedProduct = await stripe.products.update(localProduct.id, {
                default_price: price.id,
            });

            // 3. Sync your local database with the new Price ID
            await this.prisma.stripeData.update({
                where: { id: localProduct.id },
                data: { priceId: price.id }
            });

            return updatedProduct;
        } catch (error) {
            console.error('Stripe Product Update Error:', error);
            throw error;
        }
    }

    async createStripeSession(name: string, quantity: number) {
        
        const productData = await this.prisma.stripeData.findFirst({
            where: { name: name }
        });

        if (!productData?.priceId) {
            throw new Error("Price ID not found for this product. Create product first.");
        }

        const session = await stripe.checkout.sessions.create({
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
            line_items: [
                {
                    price: productData.priceId,
                    quantity: quantity,
                },
            ],
            mode: 'payment',
        });

        return { url: session.url };
    }
}