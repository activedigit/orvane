-- =====================================================================
-- عروض | Quotation marketplace core schema
-- Works on Supabase Postgres and on any plain PostgreSQL 15+.
-- Supabase-specific bits (auth.users FK, RLS, triggers) live in
-- 0002_supabase_auth.sql and 0003_rls.sql.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- identity ----------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  phone text unique,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('customer','supplier','admin')),
  status text not null default 'active' check (status in ('active','blocked','pending')),
  avatar_file_id uuid,
  locale text not null default 'ar',
  last_seen_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_role_idx on public.users(role);
create index if not exists users_status_idx on public.users(status);

-- Local (non-Supabase) auth provider credentials. Empty when Supabase Auth is used.
create table if not exists public.local_auth_credentials (
  user_id uuid primary key references public.users(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- reference data ----------
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  region_ar text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  description_ar text,
  icon text,
  keywords text[] not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null,
  name_ar text not null,
  keywords text[] not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug)
);
create index if not exists subcategories_category_idx on public.subcategories(category_id);

-- ---------- files (central registry; never expose raw paths to clients) ----------
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete set null,
  provider text not null default 'local' check (provider in ('local','supabase')),
  bucket text not null default 'private',
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  scope text not null check (scope in ('request','quotation','message','verification','logo','portfolio','avatar')),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','redacted','rejected','skipped')),
  moderation_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists files_owner_idx on public.files(owner_id);

-- ---------- profiles ----------
create table if not exists public.customer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text,
  city_id uuid references public.cities(id) on delete set null,
  whatsapp text,
  company_name text,
  requests_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  company_name text not null,
  slug text unique not null,
  description_ar text not null default '',
  logo_file_id uuid references public.files(id) on delete set null,
  city_id uuid references public.cities(id) on delete set null,
  years_experience int not null default 0,
  commercial_register text,
  website text,               -- private until unlock
  whatsapp text,              -- private until unlock
  contact_phone text,         -- private until unlock
  verification_status text not null default 'pending' check (verification_status in ('pending','under_review','verified','rejected')),
  verified_at timestamptz,
  is_available boolean not null default true,
  min_budget numeric(12,2),
  max_budget numeric(12,2),
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  quotations_count int not null default 0,
  won_count int not null default 0,
  completed_count int not null default 0,
  avg_response_minutes int,
  credits_balance int not null default 0,
  privacy_mode text not null default 'inherit' check (privacy_mode in ('inherit','hidden','visible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supplier_profiles_verification_idx on public.supplier_profiles(verification_status);
create index if not exists supplier_profiles_city_idx on public.supplier_profiles(city_id);

create table if not exists public.supplier_categories (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles(user_id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  subcategory_id uuid references public.subcategories(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists supplier_categories_unique_idx on public.supplier_categories(supplier_id, category_id, coalesce(subcategory_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists supplier_categories_category_idx on public.supplier_categories(category_id);

create table if not exists public.service_areas (
  supplier_id uuid not null references public.supplier_profiles(user_id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (supplier_id, city_id)
);
create index if not exists service_areas_city_idx on public.service_areas(city_id);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles(user_id) on delete cascade,
  title text not null,
  description_ar text,
  file_id uuid references public.files(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles(user_id) on delete cascade,
  doc_type text not null check (doc_type in ('commercial_register','vat','license','id','other')),
  file_id uuid references public.files(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- requests ----------
create sequence if not exists public.request_reference_seq start 1001;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text unique not null default ('RQ-' || nextval('public.request_reference_seq')::text),
  customer_id uuid not null references public.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  city_id uuid references public.cities(id) on delete set null,
  title text not null default '',
  description text not null default '',
  supplier_summary text,          -- sanitized summary shown to suppliers
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  budget_label text,
  urgency text not null default 'normal' check (urgency in ('normal','urgent')),
  timeline text check (timeline in ('asap','week','month','flexible')),
  project_type text,
  details jsonb not null default '{}'::jsonb,   -- questionnaire answers
  ai_meta jsonb not null default '{}'::jsonb,   -- classification confidence etc.
  status text not null default 'draft' check (status in ('draft','waiting_suppliers','receiving_quotations','reviewing_quotations','supplier_selected','closed','cancelled')),
  max_suppliers int not null default 8,
  matched_count int not null default 0,
  quotations_count int not null default 0,
  quotation_deadline timestamptz,
  selected_quotation_id uuid,
  selected_supplier_id uuid references public.users(id) on delete set null,
  unlocked_at timestamptz,
  completed_at timestamptz,
  closed_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists requests_customer_idx on public.requests(customer_id);
create index if not exists requests_status_idx on public.requests(status);
create index if not exists requests_category_idx on public.requests(category_id);
create index if not exists requests_city_idx on public.requests(city_id);
create index if not exists requests_created_idx on public.requests(created_at desc);

create table if not exists public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists request_attachments_request_idx on public.request_attachments(request_id);

create table if not exists public.request_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  supplier_id uuid not null references public.supplier_profiles(user_id) on delete cascade,
  score numeric(6,2) not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  status text not null default 'invited' check (status in ('invited','viewed','quoted','declined','expired')),
  notified_at timestamptz,
  viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
create index if not exists request_matches_supplier_idx on public.request_matches(supplier_id, status);

-- ---------- quotations ----------
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  supplier_id uuid not null references public.supplier_profiles(user_id) on delete cascade,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'SAR',
  details text not null default '',
  price_includes text,
  delivery_days int,
  validity_days int not null default 14,
  warranty text,
  notes text,
  status text not null default 'submitted' check (status in ('submitted','updated','withdrawn','selected','rejected','expired')),
  is_featured boolean not null default false,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
create index if not exists quotations_request_idx on public.quotations(request_id);
create index if not exists quotations_supplier_idx on public.quotations(supplier_id);

create table if not exists public.quotation_attachments (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.requests
  drop constraint if exists requests_selected_quotation_fk;
alter table public.requests
  add constraint requests_selected_quotation_fk foreign key (selected_quotation_id)
  references public.quotations(id) on delete set null;

-- ---------- conversations ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  supplier_id uuid not null references public.users(id) on delete cascade,
  quotation_id uuid references public.quotations(id) on delete set null,
  status text not null default 'active' check (status in ('active','unlocked','closed')),
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
create index if not exists conversations_customer_idx on public.conversations(customer_id, last_message_at desc);
create index if not exists conversations_supplier_idx on public.conversations(supplier_id, last_message_at desc);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('customer','supplier','admin')),
  last_read_at timestamptz,
  unread_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_participants_user_idx on public.conversation_participants(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.users(id) on delete set null,
  kind text not null default 'text' check (kind in ('text','image','file','voice','system')),
  body text not null default '',
  was_filtered boolean not null default false,
  filter_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- selection, unlock, payments ----------
create table if not exists public.lead_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  category_id uuid references public.categories(id) on delete cascade,
  min_project_value numeric(12,2),
  max_project_value numeric(12,2),
  price numeric(12,2) not null,
  priority int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_selections (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  supplier_id uuid not null references public.users(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  lead_price numeric(12,2) not null,
  pricing_rule_id uuid references public.lead_pricing_rules(id) on delete set null,
  status text not null default 'pending_unlock' check (status in ('pending_unlock','unlocked','cancelled','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
create index if not exists supplier_selections_supplier_idx on public.supplier_selections(supplier_id, status);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'SAR',
  purpose text not null check (purpose in ('lead_unlock','subscription','credits')),
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed','refunded','cancelled')),
  gateway text not null default 'mock',
  gateway_reference text,
  payment_method text,           -- mada | applepay | visa | mastercard | stcpay
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id, created_at desc);
create index if not exists payments_status_idx on public.payments(status);

create table if not exists public.lead_unlocks (
  id uuid primary key default gen_random_uuid(),
  selection_id uuid not null references public.supplier_selections(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  supplier_id uuid not null references public.users(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  price numeric(12,2) not null,
  method text not null check (method in ('payment','credits','subscription','promo','admin')),
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
create index if not exists lead_unlocks_supplier_idx on public.lead_unlocks(supplier_id);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  description_ar text,
  price_monthly numeric(12,2) not null,
  included_leads int not null default 0,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active','past_due','cancelled','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  included_leads int not null default 0,
  used_leads int not null default 0,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_supplier_idx on public.subscriptions(supplier_id, status);

-- credits ledger (positive = added, negative = consumed)
create table if not exists public.credits (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.users(id) on delete cascade,
  amount int not null,
  balance_after int not null,
  reason text not null check (reason in ('purchase','promo','admin_grant','lead_unlock','refund','signup_bonus')),
  ref_type text,
  ref_id uuid,
  note text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists credits_supplier_idx on public.credits(supplier_id, created_at desc);

-- ---------- reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  supplier_id uuid not null references public.users(id) on delete cascade,
  customer_id uuid not null references public.users(id) on delete cascade,
  quality smallint not null check (quality between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  price_accuracy smallint not null check (price_accuracy between 1 and 5),
  delivery_time smallint not null check (delivery_time between 1 and 5),
  overall smallint not null check (overall between 1 and 5),
  comment text,
  status text not null default 'published' check (status in ('published','hidden','pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);
create index if not exists reviews_supplier_idx on public.reviews(supplier_id, status);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  data jsonb not null default '{}'::jsonb,
  channels jsonb not null default '{"in_app": "sent"}'::jsonb, -- in_app | email | whatsapp | push -> pending|sent|failed|skipped
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read, created_at desc);

-- ---------- reports / complaints ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users(id) on delete set null,
  reported_user_id uuid references public.users(id) on delete set null,
  request_id uuid references public.requests(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  admin_note text,
  resolved_by uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports(status);

-- ---------- moderation & security ----------
create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  file_id uuid references public.files(id) on delete set null,
  kind text not null check (kind in ('text','image','document')),
  action text not null check (action in ('masked','blocked','flagged','redacted','approved')),
  detections jsonb not null default '[]'::jsonb,
  original_excerpt text,
  created_at timestamptz not null default now()
);
create index if not exists moderation_logs_user_idx on public.moderation_logs(user_id, created_at desc);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  ip text,
  event_type text not null,      -- rate_limited | unauthorized_access | contact_leak_attempt | suspicious_upload
  severity text not null default 'low' check (severity in ('low','medium','high')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists security_events_type_idx on public.security_events(event_type, created_at desc);

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  description_ar text,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.schema_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  for t in
    select unnest(array['users','local_auth_credentials','cities','categories','subcategories','customer_profiles','supplier_profiles',
      'portfolio_items','verification_documents','requests','request_matches','quotations','conversations','lead_pricing_rules',
      'supplier_selections','payments','subscription_plans','subscriptions','reviews','reports'])
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
