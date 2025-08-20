import { z } from "zod";

// Product category enum
export enum ProductCategory {
  SHIRTS = "shirts",
  POLOS = "polos", 
  HOODIES = "hoodies",
  JACKETS = "jackets",
  ACCESSORIES = "accessories",
  CUSTOM = "custom",
}

// Product schema
export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.nativeEnum(ProductCategory),
  basePrice: z.number(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(), // e.g. "Size: Large, Color: Navy"
    sku: z.string(),
    priceModifier: z.number(), // +/- from base price
    stockQuantity: z.number().optional(),
  })),
  images: z.array(z.string()), // URLs
  specifications: z.record(z.string(), z.string()).optional(), // key-value pairs
  isActive: z.boolean(),
  minimumQuantity: z.number().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Product = z.infer<typeof productSchema>;

export const createProductSchema = productSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProductPayload = z.infer<typeof createProductSchema>;