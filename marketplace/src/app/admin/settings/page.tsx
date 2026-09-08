import { requirePageRole } from '@/lib/auth';
import { getAllSettings, SETTING_DEFAULTS } from '@/lib/settings';
import { PageHeader } from '@/components/ui/misc';
import { Input, Select, SubmitButton } from '@/components/admin/forms';
import { adminSettingAction } from '@/actions/admin';
import { config } from '@/lib/config';

const META: Record<string, { label: string; hint?: string; type?: 'bool' | 'select'; options?: [string, string][] }> = {
  'matching.max_suppliers': { label: 'الحد الأقصى للمزودين لكل طلب', hint: 'يُنصح بـ 5–10' },
  'matching.min_score': { label: 'الحد الأدنى لدرجة المطابقة' },
  'pricing.default_lead_price': { label: 'السعر الافتراضي لفتح البيانات (ر.س)' },
  'pricing.currency': { label: 'العملة' },
  'supplier.privacy_mode': { label: 'إظهار هوية المزود قبل الاختيار', type: 'select', options: [['hidden', 'مخفية (شركة متخصصة في ... – المدينة)'], ['visible', 'ظاهرة']] },
  'chat.filter_after_unlock': { label: 'الاستمرار في تصفية المحادثة بعد فتح البيانات', type: 'bool' },
  'chat.block_mostly_contact_messages': { label: 'حظر الرسائل التي تتكون أساسًا من معلومات تواصل', type: 'bool' },
  'requests.quotation_window_days': { label: 'مدة استقبال العروض (أيام)' },
  'selection.unlock_expiry_days': { label: 'صلاحية فتح البيانات بعد الاختيار (أيام)' },
  'supplier.signup_bonus_credits': { label: 'نقاط ترحيبية للمزود الجديد' },
  'platform.support_email': { label: 'بريد الدعم' },
  'platform.support_phone': { label: 'هاتف الدعم' },
  'platform.name': { label: 'اسم المنصة' },
};

export default async function SettingsPage() {
  await requirePageRole(['admin']);
  const all = await getAllSettings();
  return (
    <>
      <PageHeader title="الإعدادات" description="تغييرات فورية دون الحاجة لتعديل الكود." />
      <div className="space-y-2">
        {Object.keys(SETTING_DEFAULTS).map((key) => {
          const m = META[key] ?? { label: key };
          const v = all[key];
          return (
            <form key={key} action={adminSettingAction} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
              <input type="hidden" name="key" value={key} />
              <div className="min-w-64 flex-1"><div className="text-sm font-medium text-ink">{m.label}</div><div className="text-xs text-muted ltr text-left">{key}{m.hint ? ` — ${m.hint}` : ''}</div></div>
              {m.type === 'bool' ? <Select name="value" defaultValue={String(v)} className="h-9 w-auto"><option value="true">مفعّل</option><option value="false">معطّل</option></Select>
                : m.type === 'select' ? <Select name="value" defaultValue={String(v)} className="h-9 w-auto">{m.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
                : <Input name="value" defaultValue={String(v ?? '')} className="h-9 max-w-xs" />}
              <SubmitButton size="sm" variant="secondary">حفظ</SubmitButton>
            </form>
          );
        })}
      </div>
      <div className="mt-8 rounded-lg border border-line bg-canvas p-4 text-xs text-muted">
        <div className="font-semibold text-ink-2">إعدادات البيئة (للقراءة فقط)</div>
        <ul className="mt-1 space-y-0.5 ltr text-left">
          <li>AUTH_PROVIDER = {config.auth.provider}</li><li>STORAGE_PROVIDER = {config.storage.provider}</li><li>PAYMENT_GATEWAY = {config.payments.gateway}</li><li>AI_PROVIDER = {config.ai.provider}</li>
        </ul>
      </div>
    </>
  );
}
