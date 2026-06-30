import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '../src/generated/prisma/client';
import { InventoryService, Product } from '../src/application/commands';

// Helper interface to cast Prisma namespaces cleanly within tests
interface JestMockedNamespace {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  updateMany: jest.Mock;
}

describe('InventoryService - Unit Tests', () => {
  let prismaMock: PrismaClient;
  let inventoryService: InventoryService;

  beforeEach(() => {
    // Generates a deeply mocked instance of PrismaClient safely typed to prevent circular reference compilation errors
    prismaMock = mockDeep<PrismaClient>() as unknown as PrismaClient;
    inventoryService = new InventoryService(prismaMock);
  });

  afterEach(() => {
    mockReset(prismaMock);
  });

  // --- TEST FOR: addProduct (Handling $transaction closures) ---
  describe('addProduct', () => {
    const newProduct: Product = {
      name: 'Wireless Mouse',
      price: 29.99,
      description: 'Ergonomic mouse',
      stock: 50,
      category: 'Electronics',
    };

    it('should create a product if it does not already exist', async () => {
      const mockDbResult = { ...newProduct, productId: 'prod-123' };
      const productNamespace = prismaMock.product as unknown as JestMockedNamespace;

      // Safe string lookup bypasses strict $transaction method overload rules
      (prismaMock['$transaction'] as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });

      productNamespace.findFirst.mockResolvedValue(null); 
      productNamespace.create.mockResolvedValue(mockDbResult);

      // Act
      const result = await inventoryService.addProduct(newProduct);

      // Assert
      expect(result).toEqual(mockDbResult);
      expect(prismaMock.product.findFirst).toHaveBeenCalledWith({
        where: { name: newProduct.name },
      });
    });

    it('should throw an error if the product name already exists', async () => {
      const productNamespace = prismaMock.product as unknown as JestMockedNamespace;

      (prismaMock['$transaction'] as jest.Mock).mockImplementation(async (callback) => callback(prismaMock));
      
      productNamespace.findFirst.mockResolvedValue({ productId: 'prod-123', name: 'Wireless Mouse' });

      // Act & Assert
      await expect(inventoryService.addProduct(newProduct)).rejects.toThrow('Product already exists');
      expect(prismaMock.product.create).not.toHaveBeenCalled();
    });
  });

  // --- TEST FOR: reserveStock (Atomic updates & custom count exceptions) ---
  describe('reserveStock', () => {
    it('should successfully update and return the product if stock is sufficient', async () => {
      const mockUpdatedProduct = { productId: 'prod-123', stock: 5 };
      const productNamespace = prismaMock.product as unknown as JestMockedNamespace;
      
      (prismaMock['$transaction'] as jest.Mock).mockImplementation(async (callback) => callback(prismaMock));
      
      productNamespace.updateMany.mockResolvedValue({ count: 1 });
      productNamespace.findUnique.mockResolvedValue(mockUpdatedProduct);

      // Act
      const result = await inventoryService.reserveStock('prod-123', 5);

      // Assert
      expect(result).toEqual(mockUpdatedProduct);
      expect(prismaMock.product.updateMany).toHaveBeenCalledWith({
        where: { productId: 'prod-123', stock: { gte: 5 } },
        data: { stock: { decrement: 5 } },
      });
    });

    it('should throw an error if updateMany returns a count of 0 (Oversold scenario)', async () => {
      const productNamespace = prismaMock.product as unknown as JestMockedNamespace;

      (prismaMock['$transaction'] as jest.Mock).mockImplementation(async (callback) => callback(prismaMock));
      
      productNamespace.updateMany.mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(inventoryService.reserveStock('prod-123', 10)).rejects.toThrow(
        'Oversold: Insufficient stock available.'
      );
    });
  });
});