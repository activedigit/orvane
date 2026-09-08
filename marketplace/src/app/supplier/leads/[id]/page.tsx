import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { requirePageRole } from '@/lib/auth';
import { getSelectionForSupplier } from '@/lib/services/selection';
import { getCustomerContactForSupplier, getUnlockOptions } from '@/lib/services/unlock';
import { sql } from '@/lib/db';
import { KeyValue, Alert } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UnlockPanel } from '@/components/supplier/unlock-panel';
import { ContactCard } from '@/components/request/contact-card';
import { StartChatButton } from '@/components/supplier/start-chat-button';
import { formatSAR, formatDate } from '@/lib/utils';

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(['supplier']);
  const { id } = await params;
  const s = await getSelectionForSupplier(id, user.id);
  if (!s) notFound();
  const [options, contact, [conv]] = await Promise.all([getUnlockOptions(id, user.id), getCustomerContactForSupplier(s.request_id, user.id), sql<{ id: string }[]>`select id from public.conversations where request_id = ${s.request_id} and supplier_id = ${user.id}`]);
  return (
    <>
      <Link href="/supplier/leads" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"><ArrowRight className="size-4" /> العملاء المختارون</Link>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">العميل اختار عرضك</h1>
      <p className="mt-1 text-sm text-muted">{s.reference_code} • {s.request_title}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {contact ? (
            <>
              <ContactCard title="بيانات العميل" name={contact.name} phone={contact.phone} whatsapp={contact.whatsapp} email={contact.email} note="تم فتح البيانات. تواصل مع العميل وأكّد التفاصيل، وستبقى المحادثة داخل المنصة متاحة كمرجع." />
              <div className="flex flex-wrap gap-2">
                <StartChatButton requestId={s.request_id} supplierId={user.id} conversationId={conv?.id ?? null} />
                <Button asChild variant="ghost"><Link href={`/supplier/requests/${s.request_id}`}>تفاصيل الطلب</Link></Button>
              </div>
            </>
          ) : s.status === 'pending_unlock' && options ? (
            <>
              <Alert tone="success" title="مبروك! العميل اختار عرضك ويرغب بالتواصل معك.">بيانات التواصل مقفلة حتى تفتحها. يمكنك مراسلته داخل المنصة في هذه الأثناء.</Alert>
              <UnlockPanel selectionId={s.id} options={options} />
              <StartChatButton requestId={s.request_id} supplierId={user.id} conversationId={conv?.id ?? null} />
            </>
          ) : (
            <Alert tone="warning">هذا الاختيار لم يعد متاحًا ({s.status}).</Alert>
          )}
        </div>
        <Card>
          <CardHeader><CardTitle>ملخص</CardTitle></CardHeader>
          <CardContent>
            <KeyValue className="grid-cols-1" items={[
              { label: 'عرضك', value: formatSAR(s.quotation_price) },
              { label: 'رسوم فتح البيانات', value: formatSAR(s.lead_price) },
              { label: 'الفئة', value: s.category_name },
              { label: 'المدينة', value: s.city_name },
              { label: 'تاريخ الاختيار', value: formatDate(s.created_at) },
              { label: 'صالح حتى', value: formatDate(s.expires_at) },
            ]} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
