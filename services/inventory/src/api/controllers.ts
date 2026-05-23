import { InventoryService } from "../application/commands";
import * as grpc from '@grpc/grpc-js';


export const InventoryController = (inventory: InventoryService) => {
    return {
        AddProduct: async (call: any, callback: any) => {
            try {
                const product = await call.request.product;
                const response = await inventory.addProduct(product);
                callback(null, { product: response });
            } catch (error:any) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    details: error.message
                });
            }
        },

        UpdateProduct: async (call: any, callback: any) => {
            try {
                const productId = await call.request.productId;
                const data = await call.request.data;
                const response = await inventory.updateProduct(productId, data);
                callback(null, { product: response });
            } catch (error:any) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    details: error.message
                });
            }
        },

        ReserveStock: async (call: any, callback: any) => {
            try {
                const productId = await call.request.productId;
                const amount = await call.request.amount;
                const response = await inventory.reserveStock(productId, amount);
                callback(null, { product: response });
            } catch (error:any) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    details: error.message
                });
            }
        },

        GetLowStockProducts: async (call: any, callback: any) => {
            try {
                const threshold = await call.request.threshold;
                const response = await inventory.getLowStockProducts(threshold);
                callback(null, { products: response });
            } catch (error:any) {
                callback({
                    code: grpc.status.NOT_FOUND,
                    details: error.message
                });
            }
        }
    };
}