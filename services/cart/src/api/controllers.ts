import * as grpc from '@grpc/grpc-js';
import { CartServices } from '../application/commands';

export const cartHandler = (cart: CartServices) => ({
    AddItem: async (call: any, callback: any) => {
        try {
            const productId = call.request.productId;
            const userId = call.request.userId;
            const quantity = call.request.quantity;

            cart.addItem(productId, userId, quantity);
            callback(null, {
                message : "Item added to cart"
            });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    },
    RemoveItem: async (call: any, callback: any) => {
        try {
            cart.removeItem(call.request.userId, call.request.productId);
            callback(null, {
                message : "Item removed from cart"
            });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    },

    TotalSum: async (call: any, callback: any) => {
        try {
            const totalAmount = cart.getTotalAmount;
            callback(null, { totalAmount });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    },

    GetCart: async (call: any, callback: any) => {
        try {
            const items = cart.getItems(call.request.userId);
            callback(null, { items });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    }
})