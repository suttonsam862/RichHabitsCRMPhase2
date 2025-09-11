-- Add missing columns to users table in Supabase
-- Missing columns: subrole, job_title, department, hire_date, permissions, page_access, initial_temp_password

begin;

-- Add missing columns to users table
do $$
begin
  -- Add subrole column (text, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'subrole'
  ) then
    alter table public.users add column subrole text;
  end if;

  -- Add job_title column (text, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'job_title'
  ) then
    alter table public.users add column job_title text;
  end if;

  -- Add department column (text, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'department'
  ) then
    alter table public.users add column department text;
  end if;

  -- Add hire_date column (timestamp, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'hire_date'
  ) then
    alter table public.users add column hire_date timestamp;
  end if;

  -- Add permissions column (jsonb, default empty object)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'permissions'
  ) then
    alter table public.users add column permissions jsonb default '{}'::jsonb;
  end if;

  -- Add page_access column (jsonb, default empty object)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'page_access'
  ) then
    alter table public.users add column page_access jsonb default '{}'::jsonb;
  end if;

  -- Add initial_temp_password column (text, nullable)
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'users' and column_name = 'initial_temp_password'
  ) then
    alter table public.users add column initial_temp_password text;
  end if;

end$$;

commit;