import { adminCommands } from "../application/admin.commands";
import { miscelCommands } from "../application/miscel.commands";
import { publicCommands } from "../application/public.commands";
import {
    requireNonEmptyString,
    requirePositiveNumber,
    ServiceError,
    toGrpcCallbackError,
} from "./grpcErrors";

function mapCategory(category: any) {
    return {
        id: category._id?.toString() ?? category.id,
        name: category.name,
        slug: category.slug,
        parent: category.parent?.toString() ?? "",
        isActive: category.isActive,
    };
}

function validateProductPayload(product: any, requireProductId = false) {
    if (!product || typeof product !== "object") {
        throw ServiceError.invalidArgument("Product payload is required");
    }

    if (requireProductId) {
        requireNonEmptyString(product.productId, "productId");
    }

    requireNonEmptyString(product.name, "name");
    requireNonEmptyString(product.category, "category");
    requirePositiveNumber(product.price, "price");
    requirePositiveNumber(product.stock, "stock");
}

export const InventoryHandler = (
    query: adminCommands,
    miscelQuery: miscelCommands,
    publicQuery: publicCommands
) => ({
    AddProduct: async (call: any, callback: any) => {
        try {
            const { product } = call.request;
            validateProductPayload(product);
            const newProduct = await query.addProduct(product);
            callback(null, { product: newProduct });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    UpdateProduct: async (call: any, callback: any) => {
        try {
            const productPayload = call.request.product ?? call.request;
            validateProductPayload(productPayload, true);
            const product = await query.updateProduct(productPayload);
            callback(null, { product });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    ArchiveProduct: async (call: any, callback: any) => {
        try {
            const productId = requireNonEmptyString(call.request.productId, "productId");
            const product = await query.archiveProduct(productId);
            callback(null, { product });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    AddCategory: async (call: any, callback: any) => {
        try {
            const name = requireNonEmptyString(call.request.name, "name");
            const category = await query.addCategory(name);
            callback(null, { category: mapCategory(category) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    AddCategoryTree: async (call: any, callback: any) => {
        try {
            const category = call.request.category;
            if (!category || typeof category !== "object") {
                throw ServiceError.invalidArgument("Category tree payload is required");
            }
            requireNonEmptyString(category.name, "name");
            const createdCategory = await query.addCategoryTree(category);
            callback(null, { category: createdCategory });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    UpdateCategory: async (call: any, callback: any) => {
        try {
            const categoryId = requireNonEmptyString(call.request.categoryId, "categoryId");
            const category = await query.updateCategory({
                categoryId,
                name: call.request.name,
                slug: call.request.slug,
                parent: call.request.parent,
            });
            callback(null, { category: mapCategory(category) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    ArchiveCategory: async (call: any, callback: any) => {
        try {
            const categoryId = requireNonEmptyString(call.request.categoryId, "categoryId");
            const category = await query.archiveCategory(categoryId);
            callback(null, { category: mapCategory(category) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    SyncToAlgolia: async (call: any, callback: any) => {
        try {
            const productId = requireNonEmptyString(call.request.productId, "productId");
            const response = await miscelQuery.syncToAlgolia(productId);
            callback(null, { response: JSON.stringify(response) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    GetCategoryTree: async (call: any, callback: any) => {
        try {
            const productId = requireNonEmptyString(call.request.productId, "productId");
            const categories = await miscelQuery.getCategoryTreeForProduct(productId);
            callback(null, { categories });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    GetFilterAttributes: async (call: any, callback: any) => {
        try {
            const categoryId = requireNonEmptyString(call.request.categoryId, "categoryId");
            const attributes = await miscelQuery.getFilterAttributes(categoryId);
            callback(null, {
                attributes: attributes.map((name) => ({ name, values: [] })),
            });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    SearchProducts: async (call: any, callback: any) => {
        try {
            const queryText = requireNonEmptyString(call.request.query, "query");
            const response = await publicQuery.searchProducts(queryText);
            callback(null, { response: JSON.stringify(response) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    GetProductsByCategory: async (call: any, callback: any) => {
        try {
            const categorySlug = requireNonEmptyString(call.request.categorySlug, "categorySlug");
            const response = await publicQuery.getProductsByCategory(categorySlug);
            callback(null, { response: JSON.stringify(response) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    GetRelatedProducts: async (call: any, callback: any) => {
        try {
            const productId = requireNonEmptyString(call.request.productId, "productId");
            const response = await publicQuery.getRelatedProducts(productId);
            callback(null, { response: JSON.stringify(response) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    GetFeaturedProducts: async (_call: any, callback: any) => {
        try {
            const response = await publicQuery.getFeaturedProducts();
            callback(null, { response: JSON.stringify(response) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },

    GetProductDetails: async (call: any, callback: any) => {
        try {
            const productId = requireNonEmptyString(call.request.productId, "productId");
            const response = await publicQuery.getProductDetails(productId);
            callback(null, { response: JSON.stringify(response) });
        } catch (error: any) {
            callback(toGrpcCallbackError(error));
        }
    },
});
