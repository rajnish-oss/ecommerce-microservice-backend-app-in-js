import ProductModel from "../model/productModel";
import { productProps,IProduct } from "../types/index";
import { algoliasearch } from "algoliasearch";
import Category from "../model/categoryModel";


const client = algoliasearch("ALGOLIA_APPLICATION_ID", "ALGOLIA_API_KEY");

interface CategoryNode {
    _id: string;
    name: string;
    slug?: string;
    parent: string | null;
    children?: CategoryNode[];
}

type FilterAttribute = "Size" | "Color" | "RAM" | "CPU";

const CATEGORY_FILTERS: Readonly<Record<string, readonly FilterAttribute[]>> = {
    shoes: ["Size", "Color"],
    laptops: ["RAM", "CPU"],
};

export class miscelCommands {

    private readonly productModel = ProductModel;
    private readonly algoliaClient = client;

    private formatTree(categories: CategoryNode[], parentId: string | null = null): CategoryNode[] {
        const branch: CategoryNode[] = [];

        categories.filter((c) => String(c.parent) === String(parentId)).forEach((c) => {
            const children = this.formatTree(categories, c._id);
            if (children.length > 0) {
                c.children = children;
            }
            branch.push(c);
        });

        return branch;
    }
    

    async syncToAlgolia(productId: string) {
        try {
            const product = await this.productModel.findOne({ productId });

            if (!product) {
                throw new Error("Product not found");
            }
            const response = await this.algoliaClient.addOrUpdateObject({
                indexName: product.name, // Replace with your index name
                objectID: product.productId,
                body: {
                    objectID: product.productId,
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    description: product.description || '',
                },
            });

            return response;
        } catch (error) {
            console.error(`Failed to sync product ${productId} to Algolia:`, error);
            throw new Error(
                `Algolia sync failed for product ${productId}: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            );
        }
    }

    async getCategoryTree(productId: string): Promise<CategoryNode[]> {
        try {
            const categoryTree = await Category.aggregate<CategoryNode>([
            // 1. Find the root nodes first
                { $match: { parent: null } },
                
                // 2. Recursively find all children
                {
                    $graphLookup: {
                    from: 'categories',           // The collection name
                    startWith: '$_id',            // Start with the root ID
                    connectFromField: '_id',
                    connectToField: 'parent',
                    as: 'children_recursive',     // Temporary array of all descendants
                    depthField: 'level'           // Optional: tracks how deep the node is
                    }
                }
                ]);

            const formattedTree = this.formatTree(categoryTree as CategoryNode[]);
            
            return formattedTree;

        }catch (error) {
            console.error(`Failed to sync product ${productId} to Algolia:`, error);
            throw new Error(
                `Algolia sync failed for product ${productId}: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            );
        }
    }

    async getFilterAttributes(categoryId: string): Promise<FilterAttribute[]> {
        try {
            const category = await Category.findById(categoryId)
                .select({ name: 1 })
                .lean<{ name: string } | null>();

            if (!category) {
                throw new Error("Category not found");
            }

            const normalizedCategory = category.name.trim().toLowerCase();

            if (normalizedCategory.includes("shoe")) {
                return [...CATEGORY_FILTERS.shoes];
            }

            if (normalizedCategory.includes("laptop")) {
                return [...CATEGORY_FILTERS.laptops];
            }

            return [];
        } catch (error) {
            console.error(`Failed to get filter attributes for category ${categoryId}:`, error);
            throw new Error(
                `Failed to get filter attributes for category ${categoryId}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }
}