import { requirePageRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getCities } from '@/lib/services/reference';
import { PageHeader } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerAccountForm } from '@/components/dashboard/customer-account-form';
import { logoutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export default async function AccountPage() {
  const user = await requirePageRole(['customer']);
  const [[profile], cities] = await Promise.all([
    sql<{ whatsapp: string | null; city_id: string | null; company_name: string | null }[]>`select whatsapp, city_id, company_name from public.customer_profiles where user_id = ${user.id}`,
    getCities(),
  ]);
  return (
    <>
      <PageHeader title="الحساب" description="بيانات التواصل تبقى خاصة ولا تظهر لأي مزود قبل أن تختاره." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>البيانات الشخصية</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerAccountForm user={user} profile={profile ?? null} cities={cities.map((c) => ({ id: c.id, name_ar: c.name_ar }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>الجلسة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted">مسجّل الدخول بـ {user.email}</p>
            <form action={logoutAction} className="mt-3">
              <Button variant="secondary" size="sm">تسجيل الخروج</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
