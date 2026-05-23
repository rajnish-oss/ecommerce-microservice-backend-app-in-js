import { PrismaClient } from "../generated/prisma/client"

export interface Product{
    name: string
    price: number
    description: string
    stock: number   
    category: string
}

export class InventoryService {
    constructor(private readonly prisma: PrismaClient) {}

    // Return the created product so the caller has the ID
    async addProduct(data: Product) {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.product.findFirst({
                where: { name: data.name }
            });

            if (existing) throw new Error("Product already exists");

            return await tx.product.create({ data });
        });
    }

    // Use partial updates so you don't have to send the whole object every time
    async updateProduct(productId: string, data: Partial<Product>) {
        try {
            return await this.prisma.product.update({
                where: { productId },
                data
            });
        } catch (error) {
            throw new Error("Product not found or update failed");
        }
    }

    async deacreaseStock(productId: string, amount: number) {
        try {
            return await this.prisma.product.update({
                where: { productId },
                data: {
                    stock: { decrement: amount }
                }
            });
        } catch (error) {
            throw new Error("Product not found or update failed");
        }
    }

    // Atomic and Safe
    async reserveStock(productId: string, amount: number) {
        try {
            return await this.prisma.product.update({
                where: { 
                    productId,
                    stock: { gte: amount } 
                },
                data: {
                    stock: { decrement: amount }
                }
            });
        } catch (error) {
            // P2025 is Prisma's error code for "Record not found" 
            // but here it also triggers if the 'where' condition (gte) fails
            throw new Error("Oversold: Insufficient stock available.");
        }
    }

    async getLowStockProducts(threshold: number = 10) {
        return await this.prisma.product.findMany({
            where: { stock: { lt: threshold } },
            orderBy: { stock: 'asc' } // Helpful for the Admin to see the most urgent items first
        });
    }
}