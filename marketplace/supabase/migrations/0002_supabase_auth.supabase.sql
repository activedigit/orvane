-- =====================================================================
-- Supabase-only: link public.users to auth.users and auto-provision.
-- Applied by scripts/migrate.ts only when the auth schema exists.
-- =====================================================================

alter table public.users
  drop constraint if exists users_auth_fk;
alter table public.users
  add constraint users_auth_fk foreign key (id) references auth.users(id) on delete cascade;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'customer');
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1));
begin
  if v_role not in ('customer','supplier') then v_role := 'customer'; end if;
  insert into public.users (id, email, phone, full_name, role)
  values (new.id, new.email, new.phone, v_name, v_role)
  on conflict (id) do update set email = excluded.email, phone = coalesce(excluded.phone, public.users.phone);
  if v_role = 'customer' then
    insert into public.customer_profiles (user_id, display_name) values (new.id, v_name) on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Helper used by RLS policies
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;
