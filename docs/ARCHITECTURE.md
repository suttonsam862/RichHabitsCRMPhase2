# 📊 System Architecture

## Frontend
- React + TS, Tailwind, shadcn/ui
- Router v6 (lazy, error boundaries), TanStack Query
- Layouts per role; print/export routes

## Backend
- Express + TS, Drizzle ORM
- REST + Zod; DTOs at boundaries
- RBAC: Admin, Sales, Design, Manufacturing, Accounting

## Database
- Supabase Postgres (public schema, RLS on domain tables)
- Migrations are idempotent; types regenerated after schema change
- PostgREST schema cache refresh after DDL

## Storage & Media
- Supabase Storage with path validation and signed URLs

## Testing & Quality
- Unit + integration tests, lint/format CI gates
- Circular dependency guard and route inventory scripts (optional)