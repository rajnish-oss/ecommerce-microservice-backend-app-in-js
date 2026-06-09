export interface IProduct {
  productId: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  description?: string; // Optional because required: false
  createdAt: Date;      // From timestamps: true
  updatedAt: Date;      // From timestamps: true
}

export interface productProps {
  name: string;
  price: number;
  category: string;
  stock: number;
  description?: string; // Optional because required: false
}

export interface CategoryTreeInput {
  name: string;
  slug?: string;
  children?: CategoryTreeInput[];
}

export interface CategoryTreeResult {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  isActive: boolean;
  children: CategoryTreeResult[];
}

export interface UpdateCategoryInput {
  categoryId: string;
  name?: string;
  slug?: string;
  parent?: string | null;
}
