begin;

-- 1) Ensure roles have unique slugs; backfill any null slugs and seed base roles.
do $$
begin
  -- Add unique constraint if missing
  if not exists (
    select 1 from pg_constraint where conname = 'roles_slug_unique'
  ) then
    alter table public.roles
      add constraint roles_slug_unique unique (slug);
  end if;
end$$;

-- Backfill null slugs (if any)
update public.roles
set slug = lower(regexp_replace(name, '\s+', '_', 'g'))
where slug is null;

-- Seed roles (no-op if present)
insert into public.roles (slug, name) values
  ('owner','Owner'),
  ('admin','Admin'),
  ('member','Member')
on conflict (slug) do nothing;

-- 2) Make user_roles robust when no Supabase JWT is present.
-- Drop NOT NULL and default on user_id; we'll use a trigger to fill from auth.uid() when available.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_roles'
      and column_name='user_id' and is_nullable='NO'
  ) then
    alter table public.user_roles alter column user_id drop not null;
  end if;
exception when others then
  null;
end$$;

alter table public.user_roles alter column user_id drop default;

create or replace function public.user_roles_set_user_from_jwt()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    begin
      new.user_id := auth.uid(); -- will be NULL if no JWT; that's OK
    exception when others then
      null;
    end;
  end if;
  return new;
end
$$;

drop trigger if exists trg_user_roles_set_user_from_jwt on public.user_roles;
create trigger trg_user_roles_set_user_from_jwt
before insert on public.user_roles
for each row execute function public.user_roles_set_user_from_jwt();

-- 3) Harden organizations inserts/updates against UI mismatches.
create or replace function public.organizations_fix_defaults()
returns trigger
language plpgsql
as $$
begin
  -- universal_discounts must never be NULL
  if new.universal_discounts is null then
    new.universal_discounts := '{}'::jsonb;
  end if;

  -- Mirror single-field address to address field (we only have one address field in this DB)
  if new.address is null or new.address = '' then
    new.address := null;
  end if;

  -- Clean up email field
  if new.email is null or new.email = '' then
    new.email := null;
  end if;

  return new;
end
$$;

drop trigger if exists trg_organizations_fix_defaults on public.organizations;
create trigger trg_organizations_fix_defaults
before insert or update on public.organizations
for each row execute function public.organizations_fix_defaults();

-- 4) Helpful indexes for search/sort (optional but good)
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='ix_organizations_name') then
    create index ix_organizations_name on public.organizations (lower(name));
  end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='ix_organizations_created_at') then
    create index ix_organizations_created_at on public.organizations (created_at desc);
  end if;
end$$;

commit;