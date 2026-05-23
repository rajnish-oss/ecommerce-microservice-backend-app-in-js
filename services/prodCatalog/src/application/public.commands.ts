import ProductModel from "../model/productModel";
import { productProps,IProduct } from "../types/index";
import { algoliasearch } from "algoliasearch";
import Category from "../model/categoryModel";
import { Types } from "mongoose";


const client = algoliasearch("ALGOLIA_APPLICATION_ID", "ALGOLIA_API_KEY");

export class publicCommands{
    private readonly productModel = ProductModel;
    private readonly algoliaClient = client;
    private readonly defaultPage = 1;
    private readonly defaultLimit = 10;

    async searchProducts(query: string) {
        try {
            const normalizedQuery = query.trim();

            if (!normalizedQuery) {
                throw new Error("Search query is required");
            }

            const response = await this.algoliaClient.search({
                requests: [
                    {
                        indexName: "products",
                        query: normalizedQuery,
                        hitsPerPage: 50,
                    },
                    {
                        indexName: "categories",
                        query: normalizedQuery,
                        hitsPerPage: 50,
                    },
                ],
            });

            return response;
        } catch (error) {
            console.error(`Failed to search products for query \"${query}\":`, error);
            throw new Error(
                `Product search failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    async getProductsByCategory(categorySlug: string) {
        try {
            const normalizedSlug = categorySlug.trim().toLowerCase();

            if (!normalizedSlug) {
                throw new Error("Category slug is required");
            }

            const page = this.defaultPage;
            const limit = this.defaultLimit;
            const skip = (page - 1) * limit;

            const rootCategory = await Category.findOne({ slug: normalizedSlug })
                .select({ _id: 1, name: 1, slug: 1 })
                .lean<{ _id: Types.ObjectId; name: string; slug: string } | null>();

            if (!rootCategory) {
                throw new Error("Category not found");
            }

            const descendants = await Category.aggregate<{ _id: Types.ObjectId }>([
                { $match: { _id: rootCategory._id } },
                {
                    $graphLookup: {
                        from: "categories",
                        startWith: "$_id",
                        connectFromField: "_id",
                        connectToField: "parent",
                        as: "descendants",
                    },
                },
                {
                    $project: {
                        categoryIds: {
                            $concatArrays: [["$_id"], "$descendants._id"],
                        },
                    },
                },
                { $unwind: "$categoryIds" },
                { $project: { _id: "$categoryIds" } },
            ]);

            const categoryIds = descendants.map((item) => item._id);

            const [products, total] = await Promise.all([
                this.productModel
                    .find({ category: { $in: categoryIds }, isActive: true })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                this.productModel.countDocuments({ category: { $in: categoryIds }, isActive: true }),
            ]);

            return {
                category: {
                    id: rootCategory._id.toString(),
                    name: rootCategory.name,
                    slug: rootCategory.slug,
                },
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
                products,
            };
        } catch (error) {
            console.error(`Failed to get products for category ${categorySlug}:`, error);
            throw new Error(
                `Get products by category failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    async getRelatedProducts(productId: string) {
        try {
            const normalizedProductId = productId.trim();

            if (!normalizedProductId) {
                throw new Error("Invalid product id");
            }

            const sourceProduct = await this.productModel
                .findOne({ productId: normalizedProductId, isActive: true })
                .select({ _id: 1, productId: 1, category: 1, brand: 1 })
                .lean<{
                    _id: Types.ObjectId;
                    productId: string;
                    category: Types.ObjectId;
                    brand?: string;
                } | null>();

            if (!sourceProduct) {
                throw new Error("Product not found");
            }

            const normalizedBrand = sourceProduct.brand?.trim();

            const relatedProducts = await this.productModel.aggregate([
                {
                    $match: {
                        isActive: true,
                        productId: { $ne: sourceProduct.productId },
                    },
                },
                {
                    $addFields: {
                        relevanceScore: {
                            $add: [
                                {
                                    $cond: [{ $eq: ["$category", sourceProduct.category] }, 2, 0],
                                },
                                normalizedBrand
                                    ? {
                                          $cond: [{ $eq: ["$brand", normalizedBrand] }, 1, 0],
                                      }
                                    : 0,
                            ],
                        },
                    },
                },
                { $match: { relevanceScore: { $gt: 0 } } },
                { $sort: { relevanceScore: -1, createdAt: -1 } },
                { $limit: this.defaultLimit },
                { $project: { relevanceScore: 0 } },
            ]);

            return {
                sourceProductId: sourceProduct.productId,
                total: relatedProducts.length,
                products: relatedProducts,
            };
        } catch (error) {
            console.error(`Failed to get related products for product ${productId}:`, error);
            throw new Error(
                `Get related products failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    async getFeaturedProducts() {
        try {
            const now = new Date();

            const featuredProducts = await this.productModel
                .find({
                    isActive: true,
                    $or: [
                        { isFeatured: true },
                        { showOnHomepage: true },
                        {
                            promotionActive: true,
                            promoStartAt: { $lte: now },
                            promoEndAt: { $gte: now },
                        },
                    ],
                })
                .sort({ updatedAt: -1, createdAt: -1 })
                .limit(this.defaultLimit)
                .lean();

            return {
                total: featuredProducts.length,
                products: featuredProducts,
            };
        } catch (error) {
            console.error("Failed to get featured products:", error);
            throw new Error(
                `Get featured products failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    async getProductDetails(productId: string) {
        try {

            const product = await this.productModel
                .findOne({ productId: productId, isActive: true })
                .populate({ path: "category", select: "name slug parent" })
                .lean<Record<string, any> | null>();

            if (!product) {
                throw new Error("Product not found");
            }

            const imageGallery = Array.isArray(product.imageGallery)
                ? product.imageGallery
                : Array.isArray(product.images)
                ? product.images
                : [];

            const technicalSpecifications =
                product.technicalSpecifications ?? product.specifications ?? {};

            const metadata = {
                ...(product.metadata ?? {}),
                seoTitle: product.seoTitle ?? null,
                seoDescription: product.seoDescription ?? null,
                tags: Array.isArray(product.tags) ? product.tags : [],
                brand: product.brand ?? null,
            };

            return {
                productId: product.productId,
                name: product.name,
                price: product.price,
                stock: product.stock,
                description: product.description ?? "",
                longDescription: product.longDescription ?? product.description ?? "",
                category: product.category,
                imageGallery,
                technicalSpecifications,
                metadata,
                relatedProductIds: Array.isArray(product.relatedProductIds)
                    ? product.relatedProductIds
                    : [],
                createdAt: product.createdAt ?? null,
                updatedAt: product.updatedAt ?? null,
            };
        } catch (error) {
            console.error(`Failed to get product details for product ${productId}:`, error);
            throw new Error(
                `Get product details failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    
}