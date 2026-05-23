import ProductModel from "../model/productModel";
import Category from "../model/categoryModel";
import { CategoryTreeInput, CategoryTreeResult, productProps,IProduct } from "../types/index";


export class adminCommands {
    private readonly productModel = ProductModel;

    private normalizeSlug(value: string) {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }


    async addProduct(product: productProps) {
        const existingProduct = await this.productModel.findOne({
            name: product.name,
        });

        if(existingProduct) throw new Error("Product with similar already exist");

        return await this.productModel.create(product);
    }

    async updateProduct(productData: IProduct) {
       try{ 
        const product = await this.productModel.findOneAndUpdate(
            { productId: productData.productId },
            { $set: productData },
            { new: true }
        )

        return product;
       } catch (error) {
        throw new Error("Product not found or update failed");
       }
    }

    async archiveProduct(productId: string) {
        try {
            const product = await this.productModel.findOneAndUpdate(
                { productId: productId },
                { $set: { isActive: false } },
                { new: true }
            );

            return product;
        } catch (error) {
            throw new Error("Product not found or archive failed");
        }
    
    }

    async addCategory(categoryName: string) {
        const category = await Category.create({
            name: categoryName,
            slug: this.normalizeSlug(categoryName),
            parent: null,
        });

        return category;
    }

    async addCategoryTree(category: CategoryTreeInput, parentId: string | null = null): Promise<CategoryTreeResult> {
        const createdCategory = await Category.create({
            name: category.name,
            slug: category.slug ? this.normalizeSlug(category.slug) : this.normalizeSlug(category.name),
            parent: parentId,
        });

        const children = Array.isArray(category.children) ? category.children : [];
        const createdChildren: CategoryTreeResult[] = [];

        for (const child of children) {
            const createdChild = await this.addCategoryTree(child, createdCategory._id.toString());
            createdChildren.push(createdChild);
        }

        return {
            _id: createdCategory._id.toString(),
            name: createdCategory.name,
            slug: createdCategory.slug ?? this.normalizeSlug(createdCategory.name),
            parent: createdCategory.parent ? createdCategory.parent.toString() : null,
            children: createdChildren,
        };
    }


}