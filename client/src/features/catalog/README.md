# Catalog Feature Module

This module handles product catalog management, including products, variants, and specifications.

## Structure

- `pages/` - React components for catalog pages
  - `ProductsList.tsx` - Grid view of all products with filtering and search
  - `ProductDetails.tsx` - Detailed product management with variants and specifications
- `components/` - Reusable catalog-specific components (when needed)
- `hooks/` - Custom React hooks for catalog data (when implemented)
- `api/` - API integration functions for catalog endpoints
- `types.ts` - TypeScript types and schemas for products domain
- `index.ts` - Public exports from the catalog module

## Features

- **Product Grid**: Visual catalog with filtering by category and status
- **Product Management**: Comprehensive product details with variants and specs
- **Variant System**: Size, color, and pricing variants for each product
- **Image Management**: Product photo upload and organization
- **Inventory Tracking**: Stock levels and minimum quantity alerts

## Development Status

🚧 **In Development**: This module is scaffolded with UI components but requires:
- Backend API routes implementation (`server/routes/catalog/`)
- Database schema for products, variants, and specifications
- Image upload and storage system
- Inventory management integration
- Pricing calculation system

## Usage

```tsx
import { ProductsList, ProductDetails } from '@/features/catalog';

// In routes.tsx
<Route path="/catalog" element={<ProductsList />} />
<Route path="/catalog/:id" element={<ProductDetails />} />
```