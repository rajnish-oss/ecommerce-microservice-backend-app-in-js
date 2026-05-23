import { IProductRepository } from "../application/interface";
import { Product } from "../domain/models";

export class PrismaProductRepository implements IProductRepository {
  private products: Product[] = [
    new Product({ id: "1", name: "Laptop", price: 999, description: "Fast laptop" })
  ];

  async findById(id: string): Promise<Product | null> {
    return this.products.find(p => p.props.id === id) || null;
  }

  async save(product: Product): Promise<void> {
    this.products.push(product);
  }
}