export type Role = 'customer' | 'supplier' | 'admin';
export type UserStatus = 'active' | 'blocked' | 'pending';
export type RequestStatus =
  | 'draft'
  | 'waiting_suppliers'
  | 'receiving_quotations'
  | 'reviewing_quotations'
  | 'supplier_selected'
  | 'closed'
  | 'cancelled';
export type QuotationStatus = 'submitted' | 'updated' | 'withdrawn' | 'selected' | 'rejected' | 'expired';
export type MatchStatus = 'invited' | 'viewed' | 'quoted' | 'declined' | 'expired';
export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
export type Urgency = 'normal' | 'urgent';
export type Timeline = 'asap' | 'week' | 'month' | 'flexible';

export interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: Role;
  status: UserStatus;
  avatar_file_id: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CityRow { id: string; slug: string; name_ar: string; region_ar: string | null; is_active: boolean; sort_order: number }
export interface CategoryRow { id: string; slug: string; name_ar: string; description_ar: string | null; icon: string | null; keywords: string[]; sort_order: number; is_active: boolean }
export interface SubcategoryRow { id: string; category_id: string; slug: string; name_ar: string; keywords: string[]; sort_order: number; is_active: boolean }

export interface CustomerProfileRow {
  user_id: string; display_name: string | null; city_id: string | null; whatsapp: string | null; company_name: string | null; requests_count: number;
}

export interface SupplierProfileRow {
  user_id: string;
  company_name: string;
  slug: string;
  description_ar: string;
  logo_file_id: string | null;
  city_id: string | null;
  years_experience: number;
  commercial_register: string | null;
  website: string | null;
  whatsapp: string | null;
  contact_phone: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  is_available: boolean;
  min_budget: string | null;
  max_budget: string | null;
  rating_avg: string;
  rating_count: number;
  quotations_count: number;
  won_count: number;
  completed_count: number;
  avg_response_minutes: number | null;
  credits_balance: number;
  privacy_mode: 'inherit' | 'hidden' | 'visible';
  created_at: string;
  updated_at: string;
}

export interface RequestRow {
  id: string;
  reference_code: string;
  customer_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  city_id: string | null;
  title: string;
  description: string;
  supplier_summary: string | null;
  budget_min: string | null;
  budget_max: string | null;
  budget_label: string | null;
  urgency: Urgency;
  timeline: Timeline | null;
  project_type: string | null;
  details: Record<string, unknown>;
  ai_meta: Record<string, unknown>;
  status: RequestStatus;
  max_suppliers: number;
  matched_count: number;
  quotations_count: number;
  quotation_deadline: string | null;
  selected_quotation_id: string | null;
  selected_supplier_id: string | null;
  unlocked_at: string | null;
  completed_at: string | null;
  closed_reason: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationRow {
  id: string;
  request_id: string;
  supplier_id: string;
  price: string;
  currency: string;
  details: string;
  price_includes: string | null;
  delivery_days: number | null;
  validity_days: number;
  warranty: string | null;
  notes: string | null;
  status: QuotationStatus;
  is_featured: boolean;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string; request_id: string; customer_id: string; supplier_id: string; quotation_id: string | null;
  status: 'active' | 'unlocked' | 'closed'; last_message_at: string | null; last_message_preview: string | null; created_at: string;
}

export interface MessageRow {
  id: string; conversation_id: string; sender_id: string | null; kind: 'text' | 'image' | 'file' | 'voice' | 'system';
  body: string; was_filtered: boolean; filter_meta: Record<string, unknown>; created_at: string;
}

export interface NotificationRow {
  id: string; user_id: string; type: string; title: string; body: string | null; link: string | null; data: Record<string, unknown>;
  channels: Record<string, string>; is_read: boolean; read_at: string | null; created_at: string;
}

export interface FileRow {
  id: string; owner_id: string | null; provider: 'local' | 'supabase'; bucket: string; storage_path: string; original_name: string;
  mime_type: string; size_bytes: number; scope: string; moderation_status: string; moderation_meta: Record<string, unknown>; created_at: string;
}
