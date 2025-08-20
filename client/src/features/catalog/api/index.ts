import { apiSDK } from "@/lib/api-sdk";
import { Product, CreateProductPayload, productSchema } from "../types";
import { z } from "zod";

// Products API functions (placeholder implementations)
export const catalogApi = {
  // List all products
  async getProducts(): Promise<Product[]> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log("🚧 getProducts API not yet implemented - returning empty array");
    return [];
  },

  // Get product by ID
  async getProduct(id: string): Promise<Product | null> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log(`🚧 getProduct(${id}) API not yet implemented - returning null`);
    return null;
  },

  // Create new product
  async createProduct(payload: CreateProductPayload): Promise<Product> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log("🚧 createProduct API not yet implemented");
    throw new Error("createProduct API not implemented");
  },

  // Update product
  async updateProduct(id: string, payload: Partial<CreateProductPayload>): Promise<Product> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log(`🚧 updateProduct(${id}) API not yet implemented`);
    throw new Error("updateProduct API not implemented");
  },

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    // TODO: Replace with actual API call when server routes are implemented
    console.log(`🚧 deleteProduct(${id}) API not yet implemented`);
    throw new Error("deleteProduct API not implemented");
  },
};

// React Query hooks for products (when implemented)
export const useProducts = () => {
  // TODO: Implement with @tanstack/react-query when API routes are ready
  return { data: [], isLoading: false, error: null };
};

export const useProduct = (id: string) => {
  // TODO: Implement with @tanstack/react-query when API routes are ready
  return { data: null, isLoading: false, error: null };
};