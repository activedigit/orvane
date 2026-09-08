import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Paperclip, Plus } from 'lucide-react';
import { requirePageRole } from '@/lib/auth';
import { getCustomerRequest } from '@/lib/services/requests';
import { listQuotationsForCustomer } from '@/lib/services/quotations';
import { getSupplierContactForCustomer } from '@/lib/services/unlock';
import { getReviewForRequest } from '@/lib/services/reviews';
import { detailsToItems } from '@/lib/requests/details-labels';
import { TIMELINE_LABELS } from '@/lib/requests/questionnaire';
import { RequestStatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyValue, Alert, Section } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/empty-state';
import { QuotationCompare } from '@/components/quotation/quotation-compare';
import { ReviewForm } from '@/components/request/review-form';
import { RequestActions } from '@/components/request/request-actions';
import { ContactCard } from '@/components/request/contact-card';
import { StatusStepper } from '@/components/request/status-stepper';
import { formatDateTime, formatDate } from '@/lib/utils';
import { Inbox } from 'lucide-react';

export default async function CustomerRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(['customer']);
  const { id } = await params;
  const r = await getCustomerRequest(id, user.id);
  if (!r) notFound();
  const [quotations, contact, review] = await Promise.all([listQuotationsForCustomer(id, user.id), getSupplierContactForCustomer(id, user.id), getReviewForRequest(id, user.id)]);
  const unlocked = !!contact;
  const canSelect = ['waiting_suppliers', 'receiving_quotations', 'reviewing_quotations'].includes(r.status);
  const selectedQuote = quotations.find((q) => q.supplier_id === r.selected_supplier_id);

  return (
    <>
      <Link href="/dashboard/requests" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowRight className="size-4" /> طلباتي
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted tabular">{r.reference_code}</span>
            <RequestStatusBadge status={r.status} />
            {r.urgency === 'urgent' ? <Badge tone="danger">عاجل</Badge> : null}
          </div>
          <h1 className="mt-1 text-xl font-bold text-ink sm:text-2xl">{r.title}</h1>
          <p className="mt-1 text-xs text-muted">أُنشئ في {formatDateTime(r.created_at)} • أُرسل إلى {r.matched_count} مزودين</p>
        </div>
        <RequestActions requestId={r.id} status={r.status} />
      </div>

      <div className="mt-5 rounded-lg border border-line bg-surface p-4">
        <StatusStepper status={r.status} unlocked={unlocked} />
      </div>

      {r.status === 'cancelled' ? <Alert tone="danger" className="mt-4" title="تم إلغاء هذا الطلب">{r.closed_reason ? `السبب: ${r.closed_reason}` : null}</Alert> : null}
      {r.status === 'supplier_selected' && !unlocked ? (
        <Alert tone="info" className="mt-4" title="تم إبلاغ المزود باختيارك">
          بمجرد أن يفتح المزود بيانات التواصل ستظهر بياناته هنا وتصلك رسالة. يمكنك متابعة المحادثة معه في هذه الأثناء.
        </Alert>
      ) : null}
      {contact ? (
        <div className="mt-4">
          <ContactCard title="بيانات المزود الذي اخترته" name={contact.contactName} phone={contact.phone} whatsapp={contact.whatsapp} email={contact.email} website={contact.website} note={`${contact.companyName} — تم فتح البيانات، يمكنكما التواصل مباشرة.`} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title={`العروض المستلمة (${quotations.length})`}>
            {quotations.length ? (
              <QuotationCompare quotations={quotations} requestId={r.id} canSelect={canSelect} selectedSupplierId={r.selected_supplier_id} />
            ) : r.status === 'waiting_suppliers' ? (
              <EmptyState icon={Inbox} title="بانتظار عروض المزودين" description={`أرسلنا طلبك إلى ${r.matched_count} مزودين مناسبين. عادةً تصل أول العروض خلال ساعات.`} />
            ) : (
              <EmptyState icon={Inbox} title="لا توجد عروض" description="لم يتم استقبال عروض على هذا الطلب." />
            )}
          </Section>

          {r.status === 'closed' || (unlocked && r.status === 'supplier_selected') ? (
            <Card id="review">
              <CardHeader>
                <CardTitle>{review ? 'تقييمك للمزود' : 'كيف كانت تجربتك مع المزود؟'}</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedQuote ? <p className="mb-3 text-sm text-muted">تقييمك يساعد العملاء الآخرين ويحسّن ترتيب {selectedQuote.supplier.displayName}.</p> : null}
                <ReviewForm requestId={r.id} existing={review} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الطلب</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{r.description}</p>
              <KeyValue
                className="mt-4 grid-cols-1"
                items={[
                  { label: 'الفئة', value: [r.category_name, r.subcategory_name].filter(Boolean).join(' – ') || '—' },
                  { label: 'المدينة', value: r.city_name },
                  { label: 'الميزانية المتوقعة', value: r.budget_label ?? 'غير محددة' },
                  { label: 'موعد التنفيذ', value: r.timeline ? TIMELINE_LABELS[r.timeline] : '—' },
                  { label: 'آخر موعد لاستقبال العروض', value: formatDate(r.quotation_deadline) },
                  ...detailsToItems(r.details),
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>المرفقات ({r.attachments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {r.attachments.length ? (
                <ul className="space-y-1.5">
                  {r.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={`/api/files/${a.file_id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Paperclip className="size-3.5" /> {a.original_name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">لا توجد مرفقات.</p>
              )}
              {['waiting_suppliers', 'receiving_quotations'].includes(r.status) ? (
                <Button asChild variant="ghost" size="sm" className="mt-2">
                  <Link href={`/dashboard/requests/${r.id}/attachments`}>
                    <Plus /> إضافة مرفقات
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
