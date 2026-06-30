import * as grpc from '@grpc/grpc-js';
import { orderHandler } from '../src/api/controller'; // Adjust path
import { OrderServices } from '../src/application/commands';
import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { mockDeep, mockReset } from 'jest-mock-extended';

describe('gRPC Order Handler Unit Tests', () => {
    let mockOrderService: jest.Mocked<OrderServices>;
    let handler: any;
    let mockCallback: jest.Mock;

    beforeEach(() => {
        // 1. Create a mocked instance of your service layer
        mockOrderService = {
            createOrUpdateOrder: jest.fn(),
            updateStatus: jest.fn(),
            getUserOrders: jest.fn(),
            deleteOrder: jest.fn(),
        } as unknown as jest.Mocked<OrderServices>;

        // Initialize the handler factory with the mock service
        handler = orderHandler(mockOrderService);
        mockCallback = jest.fn();
    });

    describe('CreateOrder', () => {
        const mockCall = {
            request: {
                orderDetail: { userId: 'user123', productId: 'prod456', quantity: 2 }
            }
        };

        it('should successfully create an order and call callback with data', async () => {
            const expectedOrder = { id: 'order-999' };
            mockOrderService.createOrUpdateOrder.mockResolvedValue(expectedOrder as any);

            await handler.CreateOrder(mockCall, mockCallback);

            expect(mockOrderService.createOrUpdateOrder).toHaveBeenCalledWith('user123', 'prod456', 2);
            expect(mockCallback).toHaveBeenCalledWith(null, { order: expectedOrder });
        });

        it('should invoke callback with NOT_FOUND status if service throws', async () => {
            mockOrderService.createOrUpdateOrder.mockRejectedValue(new Error('Database crash'));

            await handler.CreateOrder(mockCall, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                code: grpc.status.NOT_FOUND,
                details: 'Database crash'
            });
        });
    });

    describe('UpdateStatus', () => {
        const mockCall = {
            request: {
                orderDetail: { userId: 'user123', productId: 'prod456', status: 'SHIPPED' }
            }
        };

        it('should successfully update status', async () => {
            mockOrderService.updateStatus.mockResolvedValue('SHIPPED' as any);

            await handler.UpdateStatus(mockCall, mockCallback);

            expect(mockOrderService.updateStatus).toHaveBeenCalledWith('user123', 'prod456', 'SHIPPED');
            expect(mockCallback).toHaveBeenCalledWith(null, { status: 'SHIPPED' });
        });

        it('should forward errors to gRPC callback', async () => {
            mockOrderService.updateStatus.mockRejectedValue(new Error('Order missing'));

            await handler.UpdateStatus(mockCall, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                code: grpc.status.NOT_FOUND,
                details: 'Order missing'
            });
        });
    });

    describe('GetOrder', () => {
        const mockCall = {
            request: { orderId: 'order123' }
        };

        it('should retrieve order records successfully', async () => {
            const mockOrders = [{ id: 'order123' }];
            mockOrderService.getUserOrders.mockResolvedValue(mockOrders as any);

            await handler.GetOrder(mockCall, mockCallback);

            expect(mockOrderService.getUserOrders).toHaveBeenCalledWith('order123');
            expect(mockCallback).toHaveBeenCalledWith(null, { orders: mockOrders });
        });

        it('should forward user fetch failure to callback', async () => {
            mockOrderService.getUserOrders.mockRejectedValue(new Error('User not found'));

            await handler.GetOrder(mockCall, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                code: grpc.status.NOT_FOUND,
                details: 'User not found'
            });
        });
    });

    describe('DeleteOrder', () => {
        const mockCall = {
            request: {
                orderDetail: { userId: 'user123', productId: 'prod456' }
            }
        };

        it('should successfully call delete sequence', async () => {
            mockOrderService.deleteOrder.mockResolvedValue('Order deleted' as any);

            await handler.DeleteOrder(mockCall, mockCallback);

            expect(mockOrderService.deleteOrder).toHaveBeenCalledWith('user123', 'prod456');
            expect(mockCallback).toHaveBeenCalledWith(null, { order: 'Order deleted' });
        });

        it('should verify failure state maps custom wrapper exceptions', async () => {
            mockOrderService.deleteOrder.mockRejectedValue(
                new Error('Database failure in deleteOrder: Database connection lost')
            );

            await handler.DeleteOrder(mockCall, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                code: grpc.status.NOT_FOUND,
                details: 'Database failure in deleteOrder: Database connection lost'
            });
        });
    });
});