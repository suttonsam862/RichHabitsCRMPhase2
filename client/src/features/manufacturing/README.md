# Manufacturing Feature Module

This module handles production planning, purchase order management, and vendor coordination.

## Structure

- `pages/` - React components for manufacturing pages
  - `ProductionBoard.tsx` - Overview of all production orders and progress
  - `PoDetails.tsx` - Detailed purchase order management and milestone tracking
- `components/` - Reusable manufacturing-specific components (when needed)
- `hooks/` - Custom React hooks for manufacturing data (when implemented)
- `api/` - API integration functions for manufacturing endpoints
- `types.ts` - TypeScript types and schemas for manufacturing domain
- `index.ts` - Public exports from the manufacturing module

## Features

- **Production Board**: Overview of all active production orders with status
- **Purchase Order Details**: Detailed PO management with milestone tracking
- **Vendor Management**: Vendor information and communication tracking
- **Material Tracking**: Inventory and material cost management

## Development Status

🚧 **In Development**: This module is scaffolded with UI components but requires:
- Backend API routes implementation (`server/routes/manufacturing/`)
- Database schema for purchase orders, materials, and milestones
- Vendor management system integration
- Inventory tracking integration
- Cost calculation and reporting

## Usage

```tsx
import { ProductionBoard, PoDetails } from '@/features/manufacturing';

// In routes.tsx
<Route path="/manufacturing" element={<ProductionBoard />} />
<Route path="/manufacturing/po/:id" element={<PoDetails />} />
```