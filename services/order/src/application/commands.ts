import { emit } from 'node:cluster';
import { PrismaClient, OrderStatus } from '../generated/prisma/client';
import { emitOrderEvent } from '../kafka/producer';

export interface OrderSchema {
    orderId: number;
    productId: number;
    quantity: number;
    status: OrderStatus;
}

export interface OrderListSchema {
    userId: number;
    orders: OrderSchema[];
}

export class OrderServices {
    constructor(private readonly prisma: PrismaClient) {}

    /**
     * Creates or updates an order within a user's order list.
     * Uses upsert because of the composite ID [listId, productId].
     */
    async createOrUpdateOrder(userId: string, productId: string, quantity: number): Promise<string> {
        try {
            await this.prisma.order.upsert({
                where: {
                    listId_productId: {
                        listId: userId,
                        productId: productId
                    }
                },
                update: {
                    quantity: quantity,
                    status: OrderStatus.PENDING
                },
                create: {
                    listId: userId,
                    productId: productId,
                    quantity: quantity,
                    status: OrderStatus.PENDING
                }
            });
            emitOrderEvent(productId, quantity);
            return "Order processed successfully";
        } catch (err) {
            return `Error: ${err}`;
        }
    }

    /**
     * Updates the status of a specific product order for a user
     */
    async updateStatus(userId: string, productId: string, status: OrderStatus): Promise<OrderStatus> {
        try {
            await this.prisma.order.update({
                where: {
                    listId_productId: {
                        listId: userId,
                        productId: productId
                    }
                },
                data: { status: status }
            });
            return status;
        } catch (err) {
            throw new Error("Order not found");
        }
    }

    /**
     * Retrieves all orders for a specific user, including the parent list
     */
    async getUserOrders(userId: string) {
        try {
            return await this.prisma.orderList.findUnique({
                where: { userId: userId },
                include: {
                    orders: true // This fetches the array of orders
                }
            });
        } catch (error) {
            throw new Error("Error from order service : " + error);
        }
    }

    /**
     * Deletes a specific product from a user's order list
     */
    async deleteOrder(userId: string, productId: string): Promise<string> {
        try {
            await this.prisma.order.delete({
                where: {
                    listId_productId: {
                        listId: userId,
                        productId: productId
                    }
                }
            });
            return "Order deleted";
        } catch (err:any ) {
            throw new Error(`Database failure in deleteOrder: ${err instanceof Error ? err.message : err}`);
        }
    }
}
