
CREATE OR REPLACE FUNCTION add_missing_users_columns()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Add initial_temp_password column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS initial_temp_password TEXT';
        result := result || 'initial_temp_password added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'initial_temp_password exists; ';
    END;

    -- Add subrole column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subrole TEXT';
        result := result || 'subrole added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'subrole exists; ';
    END;

    -- Add job_title column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT';
        result := result || 'job_title added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'job_title exists; ';
    END;

    -- Add department column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT';
        result := result || 'department added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'department exists; ';
    END;

    -- Add hire_date column
    BEGIN
        EXECUTE 'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hire_date TIMESTAMP';
        result := result || 'hire_date added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'hire_date exists; ';
    END;

    -- Add permissions column
    BEGIN
        EXECUTE format('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT %L::jsonb', '{}');
        result := result || 'permissions added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'permissions exists; ';
    END;

    -- Add page_access column
    BEGIN
        EXECUTE format('ALTER TABLE public.users ADD COLUMN IF NOT EXISTS page_access JSONB DEFAULT %L::jsonb', '{}');
        result := result || 'page_access added; ';
    EXCEPTION WHEN duplicate_column THEN
        result := result || 'page_access exists; ';
    END;

    RETURN result;
END;
$$;
