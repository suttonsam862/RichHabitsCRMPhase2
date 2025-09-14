
-- Create organization_metrics table
CREATE TABLE IF NOT EXISTS public.organization_metrics (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id varchar NOT NULL,
    total_revenue integer DEFAULT 0,
    total_orders integer DEFAULT 0,
    active_sports integer DEFAULT 0,
    years_with_company integer DEFAULT 0,
    average_order_value integer DEFAULT 0,
    repeat_customer_rate integer DEFAULT 0,
    growth_rate integer DEFAULT 0,
    satisfaction_score integer DEFAULT 0,
    last_updated timestamp DEFAULT NOW() NOT NULL,
    created_at timestamp DEFAULT NOW() NOT NULL
);

-- Add foreign key constraint to organizations table
ALTER TABLE public.organization_metrics 
ADD CONSTRAINT organization_metrics_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_org_metrics_org_id ON public.organization_metrics(organization_id);

-- Insert some sample data if needed
INSERT INTO public.organization_metrics (organization_id, total_revenue, total_orders, active_sports, years_with_company, average_order_value, repeat_customer_rate, growth_rate, satisfaction_score)
SELECT 
    id,
    FLOOR(RANDOM() * 100000)::integer,
    FLOOR(RANDOM() * 500)::integer,
    FLOOR(RANDOM() * 10)::integer,
    FLOOR(RANDOM() * 5)::integer,
    FLOOR(RANDOM() * 1000)::integer,
    FLOOR(RANDOM() * 100)::integer,
    FLOOR(RANDOM() * 50)::integer,
    FLOOR(RANDOM() * 5)::integer
FROM public.organizations
WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_metrics 
    WHERE organization_metrics.organization_id = organizations.id
);

SELECT 'Organization metrics table created successfully' as status;
