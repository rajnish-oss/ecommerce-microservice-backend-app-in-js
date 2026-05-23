import * as grpc from '@grpc/grpc-js';
import { PaymentService } from '../application/commands';

export const paymentHandler = (payment: PaymentService) => ({
    // Creates a product in Stripe and the local Database
    CreateProduct: async (call: any, callback: any) => {
        try {
            const { name, price } = call.request;
            const product = await payment.createStripeProduct(name, price);
            
            callback(null, {
                id: product.id,
                message: "Stripe product created successfully"
            });
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    },

    // Updates price by creating a new Stripe Price object
    UpdateProduct: async (call: any, callback: any) => {
        try {
            const { name, newPrice } = call.request;
            await payment.updateStripeProduct(name, newPrice);
            
            callback(null, {
                message: "Stripe product and price updated successfully"
            });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    },

    // Generates the Stripe Checkout URL
    CreateCheckoutSession: async (call: any, callback: any) => {
        try {
            const { name, quantity } = call.request;
            const result = await payment.createStripeSession(name, quantity);
            
            callback(null, {
                url: result.url
            });
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    }
});