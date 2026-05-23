import { PrismaClient} from '../generated/prisma/client';
import { inventoryClient } from '../infra/grpc.client';
import * as grpc from '@grpc/grpc-js';

export interface CartItem {
    productId: number
    name :     String
    price  :   number
    category:  String
    quantity :    number
}

export interface cartRequestSchema {
    userId: number;
    item: CartItem;
}

export interface cartResponseSchema {
    userId: number;
    items: CartItem[];
}

export class CartServices {
    constructor(private readonly prisma: PrismaClient) {}

    // 1. Add (or Increment) Item
    async addItem(productId: number,userId: number, quantity: number): Promise<string> {
    try {
        // 1. Wrap gRPC call in a Promise for cleaner async/await usage
        const stockData: any = await new Promise((resolve, reject) => {
            // Setting a 500ms deadline is professional practice to avoid hanging
            const deadline = new Date(Date.now() + 500); 

            inventoryClient.getStock(
                { productId: productId }, 
                { deadline }, 
                (err: any, response: any) => {
                    if (err) return reject(err);
                    resolve(response);
                }
            );
        });

        const availableStock = stockData.stock;

        // 2. Check if the addition exceeds available stock
        const existingItem = await this.prisma.cartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: userId,
                    productId: productId
                }
            }
        });

        const currentQty = existingItem?.quantity || 0;
        if (currentQty + quantity > availableStock) {
            return `Cannot add. Stock limit reached (${availableStock} available).`;
        }

        // 3. Perform the Upsert
        await this.prisma.cartItem.upsert({
            where: {
                cartId_productId: {
                    cartId: userId,
                    productId: productId
                }
            },
            update: { quantity: { increment: quantity } },
            create: {
                cartId: userId,
                productId: productId,
                name: stockData.name as string,
                price: stockData.price,
                category: stockData.category as string,
                quantity: quantity
            }
        });

        return "Item added to cart";
    } catch (err: any) {
        // Handle specific gRPC errors (e.g., Code 4 is DEADLINE_EXCEEDED)
        if (err.code === grpc.status.DEADLINE_EXCEEDED) {
            return "Inventory service timed out. Please try again.";
        }
        console.error("Cart Error:", err);
        return "Failed to add item to cart.";
    }
}

    async updateItemByProductId(productId: number, stock: number, price: number): Promise<string> {
    try {
        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Update the price for EVERYONE who has this item
            const updatedPrice = await tx.cartItem.updateMany({
                where: { productId: productId },
                data: { price: price } // Assuming you store price in CartItem
            });

            // 2. If stock is 0, you might want to mark them as unavailable 
            // or remove them (depends on your business logic)
            if (stock <= 0) {
                await tx.cartItem.updateMany({
                    where: { productId: productId },
                    data: { isAvailable: false, quantity: 0 } 
                });
            } else {
                // 3. CAP the quantity: If a user has 10 but stock is now 5, 
                // set their quantity to 5 (the maximum available).
                await tx.cartItem.updateMany({
                    where: {
                        productId: productId,
                        quantity: { gt: stock } // only users who have MORE than available
                    },
                    data: {
                        quantity: stock
                    }
                });
            }
            
            return updatedPrice.count;
        });

        return `${result} cart items reconciled with inventory`;
    } catch (err) {
        console.error("Inventory Sync Error:", err);
        throw err; // Let the Kafka consumer handle the retry logic
    }
}
    // 2. Remove Item
    async removeItem(cartId: number, productId: number): Promise<string> {
        try {
            await this.prisma.cartItem.delete({
                where: {
                    cartId_productId: {
                        cartId: cartId,
                        productId: productId
                    }
                }
            });
            return "Item removed from cart";
        } catch (err) {
            return String(err);
        }
    }

    // 3. Get Total Amount
    async getTotalAmount(cartId: number): Promise<number> {
        const items = await this.prisma.cartItem.findMany({
            where: { cartId: cartId }
        });
        
        return items.reduce((sum: number, item: CartItem) => sum + (Number(item.price) * item.quantity), 0);
    }

    // 4. Get All Items
    async getItems(cartId: number): Promise<CartItem[]> {
        const items = await this.prisma.cartItem.findMany({
            where: { cartId: cartId }
        });

        return items.map((item: CartItem) => ({
            productId: item.productId,
            name: item.name,
            price: Number(item.price),
            category: item.category,
            quantity: item.quantity
        }));
    }
}