import * as grpc from '@grpc/grpc-js';
import { PaymentService } from '../application/commands';
import { handleStripeWebhook } from '../application/webhook';

export const paymentHandler = (payment: PaymentService) => ({
    // Creates a product in Stripe and the local Database
    CreateProduct: async (call: any, callback: any) => {
        try {
            const {productId, name, price } = call.request;
            const product = await payment.createStripeProduct(productId, name, price);
            
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
            const {productId, name, price } = call.request;
            await payment.updateStripeProduct(productId,name, price);
            
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

    DeleteProduct:async (call: any, callback: any) => {
            try {
                const {productId} = call.request;
                await payment.deleteStripeProduct(productId);
                
                callback(null, {
                    message: "Stripe product deleted successfully"
                });
            } catch (error:any) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    details: error.message
                })
            }    
    },

    CreateCheckoutSession: async (call: any, callback: any) => {
        try {
            const { productId, quantity, userId, orderId } = call.request;
            const result = await payment.createStripeSession(productId, quantity, userId, orderId);
            
            callback(null, {
                url: result.url
            });
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    },

    HandleStripeWebhook: async(call: any, callback: any) => {
        try {
            const result = await handleStripeWebhook(call.request);
            callback(null, result);
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    },

    CreateRefund: async (call: any, callback: any) => {
        try {
            const { orderId } = call.request;
            await payment.createRefund(orderId);

            callback(null, {
                message: "Refund processed successfully"
            });
        } catch (error: any) {
            callback({
                code: grpc.status.INTERNAL,
                details: error.message
            });
        }
    }
});
