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
    async createOrUpdateOrder(userId: number, productId: number, quantity: number): Promise<string> {
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
    async updateStatus(userId: number, productId: number, status: OrderStatus): Promise<string> {
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
            return "Status updated";
        } catch (err) {
            return "Order not found";
        }
    }

    /**
     * Retrieves all orders for a specific user, including the parent list
     */
    async getUserOrders(userId: number) {
        return await this.prisma.orderList.findUnique({
            where: { userId: userId },
            include: {
                orders: true // This fetches the array of orders
            }
        });
    }

    /**
     * Deletes a specific product from a user's order list
     */
    async deleteOrder(userId: number, productId: number): Promise<string> {
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
        } catch (err) {
            return "Could not delete order";
        }
    }
}