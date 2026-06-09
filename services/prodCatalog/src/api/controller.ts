import * as grpc from '@grpc/grpc-js';
import { adminCommands } from "../application/admin.commands";
import { miscelCommands } from '../application/miscel.commands';
import { publicCommands } from '../application/public.commands';

function mapCategory(category: any) {
  return {
    id: category._id?.toString() ?? category.id,
    name: category.name,
    slug: category.slug,
    parent: category.parent?.toString() ?? '',
    isActive: category.isActive,
  };
}

export const InventoryHandler = (
  query: adminCommands,
  miscelQuery: miscelCommands,
  publicQuery: publicCommands
) => ({
  AddProduct: async (call: any, callback: any) => {
    try {
      const productPayload = call.request.product ?? call.request;
      const product = await query.addProduct(productPayload);
      
      // Mapping Domain Entity -> gRPC Response
      callback(null, {product});
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  UpdateProduct: async (call: any, callback: any) => {
    try {
      const product = await query.updateProduct(call.request.product ?? call.request);
      callback(null, { product });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  ArchiveProduct: async (call: any, callback: any) => {
    try {
      const product = await query.archiveProduct(call.request.productId);
      callback(null, { product });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  AddCategory: async (call: any, callback: any) => {
    try {
      const category = await query.addCategory(call.request.name);
      callback(null, { category: mapCategory(category) });
    } catch (error: any) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: error.message
      });
    }
  },

  AddCategoryTree: async (call: any, callback: any) => {
    try {
      const category = await query.addCategoryTree(call.request.category);
      callback(null, { category });
    } catch (error: any) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: error.message
      });
    }
  },

  UpdateCategory: async (call: any, callback: any) => {
    try {
      const category = await query.updateCategory(call.request);
      callback(null, { category: mapCategory(category) });
    } catch (error: any) {
      callback({
        code: grpc.status.INVALID_ARGUMENT,
        details: error.message
      });
    }
  },

  ArchiveCategory: async (call: any, callback: any) => {
    try {
      const category = await query.archiveCategory(call.request.categoryId);
      callback(null, { category: mapCategory(category) });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  SyncToAlgolia: async (call: any, callback: any) => {
    try {
      const response = await miscelQuery.syncToAlgolia(call.request.productId);
      callback(null, { response });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  GetCategoryTree: async (call: any, callback: any) => {
    try {
      const categories = await miscelQuery.getCategoryTreeForProduct(call.request.productId);
      callback(null, { categories });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  GetFilterAttributes: async (call: any, callback: any) => {
    try {
      const attributes = await miscelQuery.getFilterAttributes(call.request.categoryId);
      callback(null, { attributes });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  SearchProducts: async (call: any, callback: any) => {
    try {
      const response = await publicQuery.searchProducts(call.request.query);
      callback(null, { response });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  GetProductsByCategory: async (call: any, callback: any) => {
    try {
      const response = await publicQuery.getProductsByCategory(call.request.categorySlug);
      callback(null, { response });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  GetRelatedProducts: async (call: any, callback: any) => {
    try {
      const response = await publicQuery.getRelatedProducts(call.request.productId);
      callback(null, { response });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  GetFeaturedProducts: async (_call: any, callback: any) => {
    try {
      const response = await publicQuery.getFeaturedProducts();
      callback(null, { response });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },

  GetProductDetails: async (call: any, callback: any) => {
    try {
      const response = await publicQuery.getProductDetails(call.request.productId);
      callback(null, { response });
    } catch (error: any) {
      callback({
        code: grpc.status.NOT_FOUND,
        details: error.message
      });
    }
  },
      
})
