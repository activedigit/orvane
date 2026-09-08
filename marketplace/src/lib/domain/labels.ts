import type { QuotationStatus, RequestStatus } from '@/lib/db/types';

export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: 'مسودة', tone: 'neutral' },
  waiting_suppliers: { label: 'بانتظار المزودين', tone: 'info' },
  receiving_quotations: { label: 'استقبال العروض', tone: 'info' },
  reviewing_quotations: { label: 'مراجعة العروض', tone: 'warning' },
  supplier_selected: { label: 'تم اختيار مزود', tone: 'success' },
  closed: { label: 'مكتمل', tone: 'neutral' },
  cancelled: { label: 'ملغي', tone: 'danger' },
};

export const QUOTATION_STATUS: Record<QuotationStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  submitted: { label: 'مرسل', tone: 'info' },
  updated: { label: 'محدّث', tone: 'info' },
  withdrawn: { label: 'مسحوب', tone: 'neutral' },
  selected: { label: 'تم اختياره', tone: 'success' },
  rejected: { label: 'لم يُختر', tone: 'neutral' },
  expired: { label: 'منتهي', tone: 'neutral' },
};

export const MATCH_STATUS: Record<string, string> = { invited: 'جديد', viewed: 'تمت المشاهدة', quoted: 'تم تقديم عرض', declined: 'تم التجاوز', expired: 'منتهي' };
export const SELECTION_STATUS: Record<string, string> = { pending_unlock: 'بانتظار فتح البيانات', unlocked: 'تم فتح البيانات', cancelled: 'ملغي', expired: 'منتهي' };
export const PAYMENT_STATUS: Record<string, string> = { pending: 'قيد الانتظار', processing: 'قيد المعالجة', succeeded: 'ناجحة', failed: 'فشلت', refunded: 'مستردة', cancelled: 'ملغاة' };
export const VERIFICATION_STATUS: Record<string, string> = { pending: 'بانتظار التوثيق', under_review: 'قيد المراجعة', verified: 'موثّق', rejected: 'مرفوض' };
export const URGENCY_LABELS: Record<string, string> = { normal: 'عادي', urgent: 'عاجل' };

export const OPEN_REQUEST_STATUSES: RequestStatus[] = ['waiting_suppliers', 'receiving_quotations', 'reviewing_quotations'];

export type QuotationBadge = 'best_rated' | 'fastest' | 'featured' | 'best_value';
export const BADGE_LABELS: Record<QuotationBadge, string> = { best_rated: 'أفضل تقييم', fastest: 'أسرع تنفيذ', featured: 'عرض مميز', best_value: 'قيمة ممتازة' };
