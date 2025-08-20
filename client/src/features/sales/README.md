# Sales Feature Module

This module handles all sales-related functionality including lead management, pipeline tracking, and sales reporting.

## Structure

- `pages/` - React components for sales pages
  - `LeadsBoard.tsx` - Kanban-style leads pipeline
  - `LeadDetails.tsx` - Individual lead detail view
- `components/` - Reusable sales-specific components (when needed)
- `hooks/` - Custom React hooks for sales data (when implemented)
- `api/` - API integration functions for sales endpoints
- `types.ts` - TypeScript types and schemas for sales domain
- `index.ts` - Public exports from the sales module

## Features

- **Lead Pipeline**: Kanban board view of leads by stage
- **Lead Details**: Detailed view and editing of individual leads
- **Sales Analytics**: Pipeline metrics and conversion tracking
- **Contact Management**: Lead contact information and communication history

## Development Status

🚧 **In Development**: This module is scaffolded with UI components but requires:
- Backend API routes implementation (`server/routes/sales/`)
- Database schema for leads and sales data
- React Query integration for data fetching
- Form handling for lead creation and updates

## Usage

```tsx
import { LeadsBoard, LeadDetails } from '@/features/sales';

// In routes.tsx
<Route path="/sales" element={<LeadsBoard />} />
<Route path="/sales/:id" element={<LeadDetails />} />
```