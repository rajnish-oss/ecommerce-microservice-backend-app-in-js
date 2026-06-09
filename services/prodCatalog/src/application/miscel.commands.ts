import ProductModel from "../model/productModel";
import { algoliasearch } from "algoliasearch";
import Category from "../model/categoryModel";


const client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_API_KEY);

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
            const indexName = "products";

            if (!product) {
                throw new Error("Product not found");
            }
            const algoliaProduct = {
                ...product.toJSON(),
                objectID: product.productId,
            };

            const response = await this.algoliaClient.saveObjects({
                indexName, // Replace with your index name
                objects: [algoliaProduct],
                waitForTasks: true,
            });

            const { taskID } = await this.algoliaClient.setSettings({
                indexName,
                indexSettings: {
                attributesForFaceting: ["product_type"],
                },
            });

            const res = await this.algoliaClient.waitForTask({ indexName, taskID });

            return res;
        } catch (error) {
            console.error(`Failed to sync product ${productId} to Algolia:`, error);
            throw new Error(
                `Algolia sync failed for product ${productId}: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            );
        }
    }

    async getCategoryTreeForProduct(productId: string): Promise<CategoryNode[]> {
    try {
        // 1. Fetch the product first to find out what category it belongs to
        const product = await this.productModel.findOne({ productId });
        if (!product) {
            throw new Error(`Product with ID ${productId} not found`);
        }

        // 2. Perform graph lookup upwards or downwards from that category
        const categoryTree = await Category.aggregate<CategoryNode>([
            { $match: { _id: product.category } },
            {
                $graphLookup: {
                    from: 'categories',
                    startWith: '$parent', // Looking UPWARDS to get the full breadcrumb path
                    connectFromField: 'parent',
                    connectToField: '_id',
                    as: 'ancestors'
                }
            }
        ]);

        return this.formatTree(categoryTree);

    } catch (error) {
        // Log accurately: The database fetch failed, not the external Algolia API
        console.error(`Database aggregation failed for product ${productId}:`, error);
        throw new Error(
            `Failed to generate category tree for product ${productId}: ${
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
