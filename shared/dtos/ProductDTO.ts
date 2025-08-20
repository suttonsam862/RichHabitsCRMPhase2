import { z } from "zod";

/**
 * Product DTO schemas for catalog management API
 */

export enum ProductCategory {
  SHIRTS = "shirts",
  POLOS = "polos",
  HOODIES = "hoodies", 
  JACKETS = "jackets",
  ACCESSORIES = "accessories",
  CUSTOM = "custom",
}

export const ProductVariantDTO = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  priceModifier: z.number(),
  stockQuantity: z.number().optional(),
});

export const ProductDTO = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.nativeEnum(ProductCategory),
  basePrice: z.number(),
  variants: z.array(ProductVariantDTO),
  images: z.array(z.string()),
  specifications: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean(),
  minimumQuantity: z.number().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateProductDTO = ProductDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateProductDTO = CreateProductDTO.partial();

// TypeScript types
export type ProductDTO = z.infer<typeof ProductDTO>;
export type ProductVariantDTO = z.infer<typeof ProductVariantDTO>;
export type CreateProductDTO = z.infer<typeof CreateProductDTO>;
export type UpdateProductDTO = z.infer<typeof UpdateProductDTO>;