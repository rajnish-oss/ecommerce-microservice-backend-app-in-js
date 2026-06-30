import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';
import type { PrismaClient } from '../src/generated/prisma/client';
import type { OrderServices as OrderServicesType } from '../src/application/commands';
import type { emitOrderEvent as emitOrderEventType } from '../src/kafka/producer';

// 1. Mock the Kafka module to isolate the unit test
jest.unstable_mockModule('../src/kafka/producer', () => ({
    emitOrderEvent: jest.fn()
}));

describe('OrderService - Unit Tests', () => {
    let prismaMock: PrismaClient;
    let orderService: OrderServicesType;
    let OrderServices: typeof import('../src/application/commands').OrderServices;
    let OrderStatus: typeof import('../src/generated/prisma/client').OrderStatus;
    let emitOrderEvent: jest.MockedFunction<typeof emitOrderEventType>;

    beforeAll(async () => {
        ({ OrderStatus } = await import('../src/generated/prisma/client'));
        ({ OrderServices } = await import('../src/application/commands'));
        ({ emitOrderEvent } = await import('../src/kafka/producer') as {
            emitOrderEvent: jest.MockedFunction<typeof emitOrderEventType>;
        });
    });

    beforeEach(() => {
        prismaMock = mockDeep<PrismaClient>() as unknown as PrismaClient;
        orderService = new OrderServices(prismaMock);
    });

    afterEach(() => {
        mockReset(prismaMock);
        jest.clearAllMocks();
    });

    describe('Create and Update Order', () => {
        // Fix: Use correct types (numbers) to match service signature
        const orderTestData = {
            userId: "12345",
            productId: "67890",
            quantity: 2,
        };

        it('Should create and update an order using upsert', async () => {
            // Fix: Mock actual payload value instead of an interface type
            const mockUpsertResponse = {
                orderId: 1,
                productId: orderTestData.productId,
                quantity: orderTestData.quantity,
                status: OrderStatus.PENDING,
                listId: orderTestData.userId
            };

            // Only the methods actually used in createOrUpdateOrder need to be mocked
            (prismaMock.order.upsert as jest.Mock).mockResolvedValue(mockUpsertResponse);

            const result = await orderService.createOrUpdateOrder(
                orderTestData.userId,
                orderTestData.productId,
                orderTestData.quantity
            );

            expect(result).toBe("Order processed successfully");
            
            // Verify Kafka side effect was called
            expect(emitOrderEvent).toHaveBeenCalledWith(orderTestData.productId, orderTestData.quantity);
        });

        it('Should return an error message if upsert fails', async () => {
            (prismaMock.order.upsert as jest.Mock).mockRejectedValue(new Error("Database connection lost"));

            const result = await orderService.createOrUpdateOrder(
                orderTestData.userId,
                orderTestData.productId,
                orderTestData.quantity
            );

            expect(result).toContain("Error: Error: Database connection lost");
        });
    });

    describe('Get Order Status', () => {

        it('should update the status of order',async () => {
            
            let mockStatusReq : {
                userId: string;
                productId: string;
                status: OrderStatus;
            } = {
                userId: "12345",
                productId: "67890",
                status: OrderStatus.SHIPPED
            };

            (prismaMock.order.update as jest.Mock).mockResolvedValue(mockStatusReq);
            const result = await orderService.updateStatus(mockStatusReq.userId, mockStatusReq.productId, mockStatusReq.status);
            expect(result).toBe(OrderStatus.SHIPPED);
        })

        it('should return an error message if update fails',async () => {
            const mockStatusReq = {
                userId: "12345",
                productId: "67890",
                status: OrderStatus.SHIPPED
            };

            (prismaMock.order.update as jest.Mock).mockRejectedValue(new Error("Database connection lost"));
            await expect(
                orderService.updateStatus(mockStatusReq.userId, mockStatusReq.productId, mockStatusReq.status)
            ).rejects.toThrow("Order not found");
        })
    })

    describe('Get User Order', () => {
    
        it('should return a list of orders for a user', async () => {
            const userId: string = "12345";

            const mockOrderList = {
                userId: userId,
                orders: [
                    {
                        orderId: 1,
                        productId: "67890",
                        quantity: 2,
                        status: OrderStatus.PENDING,
                        listId: userId
                    }
                ]
            };

            // FIXED: Changed prismaMock.order to prismaMock.orderList
            (prismaMock.orderList.findUnique as jest.Mock).mockResolvedValue(mockOrderList);
            
            const result = await orderService.getUserOrders(userId);
            
            expect(result).toEqual(mockOrderList);
            expect(prismaMock.orderList.findUnique).toHaveBeenCalledWith({
                where: { userId: userId },
                include: { orders: true }
            });
        });

        // FIXED: Corrected description to match what is actually being tested (Database Crash)
        it('should throw an error if the database connection fails', async () => {
            const userId: string = "12345";

            // FIXED: Changed prismaMock.order to prismaMock.orderList
            (prismaMock.orderList.findUnique as jest.Mock).mockRejectedValue(new Error("Database connection lost"));
            
            await expect(
                orderService.getUserOrders(userId)
            ).rejects.toThrow("Error from order service : Error: Database connection lost");
        });

        // NEW: How to actually test a "User Not Found" scenario based on your service logic
        it('should return null if the user does not exist in the database', async () => {
            const userId: string = "non-existent-id";
            
            (prismaMock.orderList.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await orderService.getUserOrders(userId);

            expect(result).toBeNull();
        });
    });

    describe('Delete Order', () => {

        it('should delete an order for a user', async () => {
            const userId: string = "12345";
            const productId: string = "67890";

            const mockDeletedOrderRes = "Order deleted";

            (prismaMock.orderList.findUnique as jest.Mock).mockRejectedValue(mockDeletedOrderRes)

            const result = await orderService.deleteOrder(userId, productId);

            expect(result).toBe(mockDeletedOrderRes);
        })

        it('should throw an error if the database connection fails', async () => {
            const userId: string = "12345";
            const productId: string = "67890";
            const dbError = new Error("Database connection lost");
        
            // Force the mock to reject with our error
            (prismaMock.order.delete as jest.Mock).mockRejectedValue(dbError);
            // Assert that the service re-throws it wrapped in your custom message
            await expect(
                orderService.deleteOrder(userId, productId)
            ).rejects.toThrow("Database failure in deleteOrder: Database connection lost");
        })
    })
});
