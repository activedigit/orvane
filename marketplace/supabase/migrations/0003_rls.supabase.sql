-- =====================================================================
-- Supabase-only: Row Level Security.
-- All writes go through server actions using the service role after
-- explicit authorization checks. Client (anon key + user JWT) access is
-- read-only and limited to what Realtime/notifications need.
-- Tables without policies are fully denied to anon/authenticated roles.
-- =====================================================================

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Public reference data
drop policy if exists "cities public read" on public.cities;
create policy "cities public read" on public.cities for select using (is_active);
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select using (is_active);
drop policy if exists "subcategories public read" on public.subcategories;
create policy "subcategories public read" on public.subcategories for select using (is_active);
drop policy if exists "plans public read" on public.subscription_plans;
create policy "plans public read" on public.subscription_plans for select using (is_active);

-- Own identity
drop policy if exists "users read own" on public.users;
create policy "users read own" on public.users for select using (id = auth.uid());

drop policy if exists "customer profile own" on public.customer_profiles;
create policy "customer profile own" on public.customer_profiles for select using (user_id = auth.uid());

-- Supplier profile: owner only (public view is served by the server with privacy rules applied)
drop policy if exists "supplier profile own" on public.supplier_profiles;
create policy "supplier profile own" on public.supplier_profiles for select using (user_id = auth.uid());

-- Requests: customer sees own; matched suppliers see requests they were invited to
drop policy if exists "requests customer own" on public.requests;
create policy "requests customer own" on public.requests for select using (customer_id = auth.uid());
drop policy if exists "requests matched supplier" on public.requests;
create policy "requests matched supplier" on public.requests for select using (
  exists (select 1 from public.request_matches m where m.request_id = requests.id and m.supplier_id = auth.uid())
);

drop policy if exists "matches supplier own" on public.request_matches;
create policy "matches supplier own" on public.request_matches for select using (supplier_id = auth.uid());

-- Quotations: supplier sees own; customer sees quotations on own requests (never competitors' for suppliers)
drop policy if exists "quotations supplier own" on public.quotations;
create policy "quotations supplier own" on public.quotations for select using (supplier_id = auth.uid());
drop policy if exists "quotations customer of request" on public.quotations;
create policy "quotations customer of request" on public.quotations for select using (
  exists (select 1 from public.requests r where r.id = quotations.request_id and r.customer_id = auth.uid())
);

-- Conversations & messages: participants only (used by Realtime subscriptions)
drop policy if exists "conversations participants" on public.conversations;
create policy "conversations participants" on public.conversations for select using (
  customer_id = auth.uid() or supplier_id = auth.uid()
);
drop policy if exists "participants own" on public.conversation_participants;
create policy "participants own" on public.conversation_participants for select using (user_id = auth.uid());
drop policy if exists "messages participants" on public.messages;
create policy "messages participants" on public.messages for select using (
  exists (select 1 from public.conversation_participants p where p.conversation_id = messages.conversation_id and p.user_id = auth.uid())
);

-- Selections / unlocks / payments / credits / subscriptions: own rows
drop policy if exists "selections own" on public.supplier_selections;
create policy "selections own" on public.supplier_selections for select using (supplier_id = auth.uid() or customer_id = auth.uid());
drop policy if exists "unlocks own" on public.lead_unlocks;
create policy "unlocks own" on public.lead_unlocks for select using (supplier_id = auth.uid() or customer_id = auth.uid());
drop policy if exists "payments own" on public.payments;
create policy "payments own" on public.payments for select using (user_id = auth.uid());
drop policy if exists "credits own" on public.credits;
create policy "credits own" on public.credits for select using (supplier_id = auth.uid());
drop policy if exists "subscriptions own" on public.subscriptions;
create policy "subscriptions own" on public.subscriptions for select using (supplier_id = auth.uid());

-- Reviews: published are public
drop policy if exists "reviews public" on public.reviews;
create policy "reviews public" on public.reviews for select using (status = 'published');

-- Notifications: own
drop policy if exists "notifications own" on public.notifications;
create policy "notifications own" on public.notifications for select using (user_id = auth.uid());

-- Admin: full read on everything through role helper
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('drop policy if exists "admin read all" on public.%I', t);
    execute format('create policy "admin read all" on public.%I for select using (public.current_user_role() = %L)', t, 'admin');
  end loop;
end $$;

-- Realtime publication for chat + notifications
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.messages;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.conversations;
    exception when duplicate_object then null; end;
  end if;
end $$;
