import { InventoryService } from "../application/commands";
import * as grpc from '@grpc/grpc-js';


export const InventoryController = (inventory: InventoryService) => {
    const getProductId = (request: any) => String(request.product_id ?? request.productId ?? "");
    const getProductUpdateData = (data: any) => ({
        name: data?.name,
        price: data?.price,
        description: data?.description,
        stock: data?.stock,
        category: data?.category,
    });

    return {
        AddProduct: async (call: any, callback: any) => {
            try {
                const response = await inventory.addProduct(call.request);
                callback(null, { product: response });
            } catch (error:any) {
                callback({
                    code: error.message === "Product already exists" ? grpc.status.ALREADY_EXISTS : grpc.status.INTERNAL,
                    details: error.message
                });
            }
        },

        UpdateProduct: async (call: any, callback: any) => {
            try {
                const productId = getProductId(call.request);
                const data = getProductUpdateData(call.request.data);
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
                const productId = getProductId(call.request);
                const amount = call.request.amount;
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
                const threshold = call.request.threshold;
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