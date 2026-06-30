import ProductModel from "../model/productModel";
import Category from "../model/categoryModel";
import { Types } from "mongoose";
import {
    CategoryTreeInput,
    CategoryTreeResult,
    IProduct,
    productProps,
    UpdateCategoryInput,
} from "../types/index";
import { ServiceError } from "../api/grpcErrors";
import {
    emitProductArchived,
    emitProductCreated,
    emitProductUpdated,
    publishCatalogEventSafely,
} from "../kafka/producer";


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

        if(existingProduct) throw ServiceError.alreadyExists("Product with similar already exist");

        const created = await this.productModel.create(product);
        await publishCatalogEventSafely(
            () => emitProductCreated(created),
            `product created ${created.productId}`
        );

        return created;
    }

    async updateProduct(productData: IProduct) {
        const product = await this.productModel.findOneAndUpdate(
            { productId: productData.productId },
            { $set: productData },
            { new: true, runValidators: true }
        );

        if (!product) {
            throw ServiceError.notFound("Product not found");
        }

        await publishCatalogEventSafely(
            () => emitProductUpdated(product),
            `product updated ${product.productId}`
        );

        return product;
    }

    async archiveProduct(productId: string) {
        const product = await this.productModel.findOneAndUpdate(
            { productId },
            { $set: { isActive: false } },
            { new: true }
        );

        if (!product) {
            throw ServiceError.notFound("Product not found");
        }

        await publishCatalogEventSafely(
            () => emitProductArchived(product),
            `product archived ${product.productId}`
        );

        return product;
    }

    async addCategory(categoryName: string) {
        const name = categoryName.trim();
        if (!name) {
            throw ServiceError.invalidArgument("Category name is required");
        }

        const slug = this.normalizeSlug(name);
        const existingCategory = await Category.findOne({ slug });
        if (existingCategory) {
            throw ServiceError.alreadyExists("Category already exists");
        }

        const category = await Category.create({
            name,
            slug,
            parent: null,
        });

        return category;
    }

    async addCategoryTree(category: CategoryTreeInput, parentId: string | null = null): Promise<CategoryTreeResult> {
        const name = category.name.trim();
        if (!name) {
            throw ServiceError.invalidArgument("Category name is required");
        }

        const slug = this.normalizeSlug(category.slug || name);
        const existingCategory = await Category.findOne({ slug });
        if (existingCategory) {
            throw ServiceError.alreadyExists(`Category with slug "${slug}" already exists`);
        }

        const createdCategory = await Category.create({
            name,
            slug,
            parent: parentId,
        });

        const children = Array.isArray(category.children) ? category.children : [];
        const createdChildren: CategoryTreeResult[] = [];

        for (const child of children) {
            const createdChild = await this.addCategoryTree(child, createdCategory._id.toString());
            createdChildren.push(createdChild);
        }

        return {
            id: createdCategory._id.toString(),
            name: createdCategory.name,
            slug: createdCategory.slug,
            parent: createdCategory.parent ? createdCategory.parent.toString() : null,
            isActive: createdCategory.isActive,
            children: createdChildren,
        };
    }

    async updateCategory(input: UpdateCategoryInput) {
        const category = await Category.findById(input.categoryId);
        if (!category) {
            throw ServiceError.notFound("Category not found");
        }

        if (input.parent === input.categoryId) {
            throw ServiceError.invalidArgument("Category cannot be its own parent");
        }

        if (input.parent) {
            const parent = await Category.findById(input.parent);
            if (!parent) {
                throw ServiceError.notFound("Parent category not found");
            }
        }

        if (input.name !== undefined) {
            const name = input.name.trim();
            if (!name) {
                throw ServiceError.invalidArgument("Category name cannot be empty");
            }
            category.name = name;
        }

        if (input.slug !== undefined || input.name !== undefined) {
            const slug = this.normalizeSlug(input.slug || category.name);
            const slugOwner = await Category.findOne({
                slug,
                _id: { $ne: category._id },
            });
            if (slugOwner) {
                throw ServiceError.alreadyExists(`Category with slug "${slug}" already exists`);
            }
            category.slug = slug;
        }

        if (input.parent !== undefined) {
            category.parent = input.parent
                ? new Types.ObjectId(input.parent)
                : null;
        }

        return category.save();
    }

    async archiveCategory(categoryId: string) {
        const category = await Category.findByIdAndUpdate(
            categoryId,
            { $set: { isActive: false } },
            { new: true }
        );

        if (!category) {
            throw ServiceError.notFound("Category not found");
        }

        return category;
    }

}
