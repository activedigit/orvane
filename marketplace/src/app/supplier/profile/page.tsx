import Link from 'next/link';
import { requirePageRole } from '@/lib/auth';
import { getOwnSupplierProfile } from '@/lib/services/suppliers';
import { getCategories, getCities } from '@/lib/services/reference';
import { PageHeader, Alert } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupplierProfileForm } from '@/components/supplier/profile-form';
import { LogoUploader, PortfolioManager, VerificationDocs } from '@/components/supplier/profile-assets';
import { VERIFICATION_STATUS } from '@/lib/domain/labels';

export default async function SupplierProfilePage() {
  const user = await requirePageRole(['supplier']);
  const [own, categories, cities] = await Promise.all([getOwnSupplierProfile(user.id), getCategories(), getCities()]);
  if (!own) return <Alert tone="warning">لم يتم إنشاء الملف التجاري بعد.</Alert>;
  const v = own.profile.verification_status;
  return (
    <>
      <PageHeader title="ملفي التجاري" description="ملفك يظهر للعملاء بعد اختيارك، ويستخدم في مطابقة الطلبات." actions={<Link href={`/suppliers/${own.profile.slug}`} className="text-sm text-primary hover:underline">عرض الصفحة العامة</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>الشعار</CardTitle></CardHeader>
            <CardContent><LogoUploader companyName={own.profile.company_name} logoFileId={own.profile.logo_file_id} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>البيانات</CardTitle></CardHeader>
            <CardContent>
              <SupplierProfileForm user={user} profile={own.profile} categories={categories.map((c) => ({ id: c.id, name_ar: c.name_ar, subcategories: c.subcategories.map((s) => ({ id: s.id, name_ar: s.name_ar })) }))} cities={cities.map((c) => ({ id: c.id, name_ar: c.name_ar }))} categoryIds={own.categoryIds} subcategoryIds={own.subcategoryIds} cityIds={own.cityIds} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>أعمال سابقة</CardTitle></CardHeader>
            <CardContent><PortfolioManager items={own.portfolio} /></CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card id="verification">
            <CardHeader><CardTitle>التوثيق</CardTitle><Badge tone={v === 'verified' ? 'success' : v === 'rejected' ? 'danger' : 'warning'}>{VERIFICATION_STATUS[v]}</Badge></CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted">ارفع السجل التجاري (وأي تراخيص) ليراجعها فريق المنصة. التوثيق شرط لاستقبال الطلبات وتقديم العروض.</p>
              <VerificationDocs documents={own.documents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
