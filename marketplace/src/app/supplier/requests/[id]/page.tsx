import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Paperclip, Lock } from 'lucide-react';
import { requirePageRole } from '@/lib/auth';
import { getSupplierRequest } from '@/lib/services/requests';
import { getOwnQuotation } from '@/lib/services/quotations';
import { getOwnSupplierProfile } from '@/lib/services/suppliers';
import { getCustomerContactForSupplier } from '@/lib/services/unlock';
import { getAiProvider } from '@/lib/ai';
import { sql } from '@/lib/db';
import { detailsToItems } from '@/lib/requests/details-labels';
import { TIMELINE_LABELS } from '@/lib/requests/questionnaire';
import { RequestStatusBadge, QuotationStatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyValue, Alert } from '@/components/ui/misc';
import { QuotationForm } from '@/components/supplier/quotation-form';
import { StartChatButton } from '@/components/supplier/start-chat-button';
import { ContactCard } from '@/components/request/contact-card';
import { formatDate, formatDateTime, formatSAR, pluralDays } from '@/lib/utils';

export default async function SupplierRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(['supplier']);
  const { id } = await params;
  const r = await getSupplierRequest(id, user.id);
  if (!r) notFound();
  const [own, quotation, contact, [conv], [selection]] = await Promise.all([
    getOwnSupplierProfile(user.id),
    getOwnQuotation(user.id, id),
    getCustomerContactForSupplier(id, user.id),
    sql<{ id: string }[]>`select id from public.conversations where request_id = ${id} and supplier_id = ${user.id}`,
    sql<{ id: string; status: string }[]>`select id, status from public.supplier_selections where request_id = ${id} and supplier_id = ${user.id}`,
  ]);
  const verified = own?.profile.verification_status === 'verified';
  const open = ['waiting_suppliers', 'receiving_quotations'].includes(r.status);
  const iAmSelected = r.selected_supplier_id === user.id;
  const ai = await getAiProvider();
  const suggestions = open && !quotation ? await ai.suggestQuotationStructure({ title: r.title, description: r.description, category: r.category_name, subcategory: r.subcategory_name, city: r.city_name, budgetLabel: r.budget_label, timeline: r.timeline, urgency: r.urgency, details: r.details }) : [];

  return (
    <>
      <Link href="/supplier/requests" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"><ArrowRight className="size-4" /> الطلبات المناسبة</Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted tabular">{r.reference_code}</span>
        <RequestStatusBadge status={r.status} />
        {r.urgency === 'urgent' ? <Badge tone="danger">عاجل</Badge> : null}
        {iAmSelected ? <Badge tone="success">العميل اختار عرضك</Badge> : null}
      </div>
      <h1 className="mt-1 text-xl font-bold text-ink sm:text-2xl">{r.title}</h1>
      <p className="mt-1 text-xs text-muted">{r.customer_label} • نُشر {formatDateTime(r.published_at || r.created_at)} • {r.quotations_count} عروض مقدمة • آخر موعد {formatDate(r.quotation_deadline)}</p>

      {iAmSelected && selection && selection.status !== 'unlocked' ? (
        <Alert tone="success" title="مبروك! العميل اختار عرضك ويرغب بالتواصل معك." className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>بيانات التواصل مقفلة حتى تفتحها.</span>
            <Button asChild size="sm"><Link href={`/supplier/leads/${selection.id}`}><Lock /> فتح بيانات العميل</Link></Button>
          </div>
        </Alert>
      ) : null}
      {contact ? <div className="mt-4"><ContactCard title="بيانات العميل" name={contact.name} phone={contact.phone} whatsapp={contact.whatsapp} email={contact.email} note="تم فتح البيانات. تواصل مع العميل مباشرة." /></div> : null}
      {!iAmSelected && r.status === 'supplier_selected' ? <Alert tone="info" className="mt-4">اختار العميل عرضًا آخر لهذا الطلب. شكرًا لمشاركتك.</Alert> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{quotation ? 'عرضك' : 'قدّم عرضك الخاص'}</CardTitle>
              {quotation ? <QuotationStatusBadge status={quotation.status} /> : null}
            </CardHeader>
            <CardContent>
              {!verified ? (
                <Alert tone="warning" title="حسابك غير موثّق بعد">لا يمكنك تقديم عروض قبل توثيق الحساب. <Link href="/supplier/profile#verification" className="underline">ارفع السجل التجاري</Link>.</Alert>
              ) : quotation && !open ? (
                <div className="space-y-3">
                  <div className="text-2xl font-bold tabular text-ink">{formatSAR(quotation.price)}</div>
                  <KeyValue items={[{ label: 'مدة التنفيذ', value: quotation.delivery_days ? pluralDays(quotation.delivery_days) : '—' }, { label: 'الضمان', value: quotation.warranty ?? '—' }, { label: 'صلاحية العرض', value: pluralDays(quotation.validity_days) }, { label: 'تاريخ التقديم', value: formatDateTime(quotation.submitted_at) }]} />
                  <p className="text-sm text-ink-2">{quotation.details}</p>
                </div>
              ) : open ? (
                <QuotationForm requestId={r.id} existing={quotation} suggestions={suggestions} existingAttachments={quotation?.attachments} />
              ) : (
                <Alert tone="info">انتهى استقبال العروض لهذا الطلب.</Alert>
              )}
            </CardContent>
          </Card>
          {verified ? (
            <div className="flex flex-wrap gap-2">
              <StartChatButton requestId={r.id} supplierId={user.id} conversationId={conv?.id ?? null} />
              <p className="w-full text-xs text-muted">المحادثة مجهولة: لا ترى بيانات العميل ولا يرى بياناتك حتى يختارك وتفتح البيانات.</p>
            </div>
          ) : null}
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader><CardTitle>تفاصيل الطلب</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{r.description}</p>
              <KeyValue className="mt-4 grid-cols-1" items={[
                { label: 'الفئة', value: [r.category_name, r.subcategory_name].filter(Boolean).join(' – ') || '—' },
                { label: 'المدينة', value: r.city_name },
                { label: 'الميزانية المتوقعة', value: r.budget_label ?? 'غير محددة' },
                { label: 'موعد التنفيذ', value: r.timeline ? TIMELINE_LABELS[r.timeline] : '—' },
                ...detailsToItems(r.details),
              ]} />
              <div className="mt-3 text-xs text-muted">سبب المطابقة: {r.match.reasons.join('، ')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>مرفقات العميل ({r.attachments.length})</CardTitle></CardHeader>
            <CardContent>
              {r.attachments.length ? (
                <ul className="space-y-1.5">{r.attachments.map((a) => <li key={a.id}><a href={`/api/files/${a.file_id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><Paperclip className="size-3.5" /> {a.original_name}</a></li>)}</ul>
              ) : <p className="text-sm text-muted">لا توجد مرفقات.</p>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
