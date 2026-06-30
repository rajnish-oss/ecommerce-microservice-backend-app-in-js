import { InventoryController } from '../src/api/controllers';
import * as grpc from '@grpc/grpc-js';

describe('InventoryController - Unit Tests', () => {
  let mockService: any;
  let controller: any;

  beforeEach(() => {
    mockService = {
      addProduct: jest.fn(),
    };
    controller = InventoryController(mockService);
  });

  it('should respond with a product payload on successful calls', async () => {
    const mockRequestCall = { request: { name: 'Keyboard', price: 45 } };
    const mockCallback = jest.fn();
    const serviceResponse = { productId: 'k-1', name: 'Keyboard' };

    mockService.addProduct.mockResolvedValue(serviceResponse);

    // Act
    await controller.AddProduct(mockRequestCall, mockCallback);

    // Assert
    expect(mockService.addProduct).toHaveBeenCalledWith(mockRequestCall.request);
    expect(mockCallback).toHaveBeenCalledWith(null, { product: serviceResponse });
  });

  it('should map specific error messages to correct gRPC status codes', async () => {
    const mockRequestCall = { request: { name: 'Duplicate' } };
    const mockCallback = jest.fn();

    mockService.addProduct.mockRejectedValue(new Error('Product already exists'));

    // Act
    await controller.AddProduct(mockRequestCall, mockCallback);

    // Assert
    expect(mockCallback).toHaveBeenCalledWith({
      code: grpc.status.ALREADY_EXISTS,
      details: 'Product already exists',
    });
  });
});