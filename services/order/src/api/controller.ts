import * as grpc from '@grpc/grpc-js';
import { OrderServices } from '../application/commands';


export const orderHandler = (orderService: OrderServices) => ({
    CreateOrder: async (call: any, callback: any) => {
        try {
            const orderDetail = call.request.orderDetail;
            const order = await orderService.createOrUpdateOrder(orderDetail.userId, orderDetail.productId, orderDetail.quantity);
            callback(null, { order });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    },
    UpdateStatus: async (call: any, callback: any) => {
        try {
            const orderDetail = call.request.orderDetail;
            const status = await orderService.updateStatus(orderDetail.userId, orderDetail.productId, orderDetail.status);
            callback(null, { status });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    },

    GetOrder: async (call: any, callback: any) => {
        try {
            const orderId = call.request.orderId;
            const orders = await  orderService.getUserOrders(orderId);
            callback(null, { orders });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    },

    DeleteOrder: async (call: any, callback: any) => {
        try {
            const orderDetail = call.request.orderDetail;
            const order = await orderService.deleteOrder(orderDetail.userId, orderDetail.productId);
            callback(null, { order });
        } catch (error: any) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: error.message
            });
        }
    }

});
