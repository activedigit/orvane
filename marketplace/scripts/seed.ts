/**
 * Seeds reference data + realistic Arabic demo data.
 *   npm run db:seed            (fails if users already exist)
 *   npm run db:seed -- --reset (wipes all data first)
 * Uses the platform services for the marketplace flow so seeded data is
 * exactly what the app produces (matching, quotations, chat filtering,
 * selection, unlock, reviews).
 */
import './load-env';
import 'server-only';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { sql } from '@/lib/db';
import { config } from '@/lib/config';
import { CATEGORIES, CITIES, CUSTOMERS, PLANS, PRICING_RULES, SUPPLIERS } from './seed-data';
import { SETTING_DEFAULTS } from '@/lib/settings';
import { createRequest } from '@/lib/services/requests';
import { submitQuotation } from '@/lib/services/quotations';
import { getOrCreateConversation, sendMessage } from '@/lib/services/chat';
import { selectSupplier } from '@/lib/services/selection';
import { startUnlock } from '@/lib/services/unlock';
import { createReview } from '@/lib/services/reviews';
import type { SessionUser } from '@/lib/auth/types';

export const DEMO_PASSWORD = 'Demo@1234';

async function createUser(input: { email: string; password: string; fullName: string; role: 'customer' | 'supplier' | 'admin'; phone?: string }): Promise<string> {
  if (config.auth.provider === 'supabase') {
    const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true, phone: input.phone, phone_confirm: !!input.phone, user_metadata: { full_name: input.fullName, role: input.role } });
    if (error || !data.user) throw new Error(`supabase createUser ${input.email}: ${error?.message}`);
    await sql`insert into public.users (id, email, phone, full_name, role) values (${data.user.id}, ${input.email}, ${input.phone ?? null}, ${input.fullName}, ${input.role})
      on conflict (id) do update set full_name = excluded.full_name, role = excluded.role, phone = excluded.phone`;
    return data.user.id;
  }
  const [u] = await sql<{ id: string }[]>`insert into public.users (email, phone, full_name, role) values (${input.email}, ${input.phone ?? null}, ${input.fullName}, ${input.role}) returning id`;
  await sql`insert into public.local_auth_credentials (user_id, password_hash) values (${u.id}, ${await bcrypt.hash(input.password, 10)})`;
  return u.id;
}

async function reset() {
  const tables = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' and tablename <> 'schema_migrations'`;
  await sql.unsafe(`truncate ${tables.map((t) => `public."${t.tablename}"`).join(', ')} restart identity cascade`);
  if (config.auth.provider === 'supabase') {
    const admin = createClient(config.supabase.url, config.supabase.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) if (u.email?.endsWith('@demo.sa') || u.email === 'admin@demo.sa') await admin.auth.admin.deleteUser(u.id);
  }
  await sql`alter sequence public.request_reference_seq restart with 1001`;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const asUser = (id: string, role: SessionUser['role'], name: string): SessionUser => ({ id, role, fullName: name, email: null, phone: null, status: 'active' });

async function main() {
  const doReset = process.argv.includes('--reset');
  if (doReset) { console.log('resetting data ...'); await reset(); }
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from public.users`;
  if (n > 0) throw new Error('توجد بيانات مسبقًا. استخدم --reset لإعادة التهيئة.');

  // ---- reference data
  const cityId: Record<string, string> = {};
  for (const [i, c] of CITIES.entries()) {
    const [row] = await sql<{ id: string }[]>`insert into public.cities (slug, name_ar, region_ar, sort_order) values (${c.slug}, ${c.name_ar}, ${c.region_ar}, ${i}) returning id`;
    cityId[c.slug] = row.id;
  }
  const catId: Record<string, string> = {};
  const subId: Record<string, string> = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const [row] = await sql<{ id: string }[]>`insert into public.categories (slug, name_ar, description_ar, icon, keywords, sort_order) values (${c.slug}, ${c.name_ar}, ${c.description_ar}, ${c.icon}, ${c.keywords}, ${i}) returning id`;
    catId[c.slug] = row.id;
    for (const [j, s] of c.subs.entries()) {
      const [srow] = await sql<{ id: string }[]>`insert into public.subcategories (category_id, slug, name_ar, keywords, sort_order) values (${row.id}, ${s.slug}, ${s.name_ar}, ${s.keywords}, ${j}) returning id`;
      subId[s.slug] = srow.id;
    }
  }
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await sql`insert into public.admin_settings (key, value) values (${key}, ${sql.json(value as never)}) on conflict (key) do nothing`;
  }
  for (const r of PRICING_RULES) {
    await sql`insert into public.lead_pricing_rules (name_ar, min_project_value, max_project_value, price, priority) values (${r.name_ar}, ${r.min}, ${r.max}, ${r.price}, ${r.priority})`;
  }
  await sql`insert into public.lead_pricing_rules (name_ar, category_id, min_project_value, max_project_value, price, priority) values ('خدمات الشركات – سعر موحد', ${catId.business}, null, null, 149, 20)`;
  for (const p of PLANS) {
    await sql`insert into public.subscription_plans (slug, name_ar, description_ar, price_monthly, included_leads, features, sort_order) values (${p.slug}, ${p.name_ar}, ${p.description_ar}, ${p.price_monthly}, ${p.included_leads}, ${sql.json(p.features)}, ${p.sort_order})`;
  }
  console.log('reference data ✓');

  // ---- users
  const adminId = await createUser({ email: 'admin@demo.sa', password: DEMO_PASSWORD, fullName: 'مدير المنصة', role: 'admin' });
  const customers: Record<string, { id: string; name: string }> = {};
  for (const c of CUSTOMERS) {
    const id = await createUser({ email: c.email, password: DEMO_PASSWORD, fullName: c.name, role: 'customer', phone: c.phone });
    await sql`insert into public.customer_profiles (user_id, display_name, city_id, whatsapp, company_name) values (${id}, ${c.name}, ${cityId[c.city]}, ${c.whatsapp}, ${c.company}) on conflict (user_id) do update set city_id = excluded.city_id, whatsapp = excluded.whatsapp, company_name = excluded.company_name`;
    customers[c.email] = { id, name: c.name };
  }
  const suppliers: Record<string, { id: string; name: string }> = {};
  for (const s of SUPPLIERS) {
    const id = await createUser({ email: s.email, password: DEMO_PASSWORD, fullName: s.name, role: 'supplier', phone: s.phone });
    const verified = s.verified !== false;
    await sql`insert into public.supplier_profiles (user_id, company_name, slug, description_ar, city_id, years_experience, commercial_register, website, whatsapp, contact_phone, verification_status, verified_at,
        rating_avg, rating_count, quotations_count, won_count, completed_count, avg_response_minutes, min_budget, max_budget, credits_balance, created_at)
      values (${id}, ${s.company}, ${s.slug}, ${s.description}, ${cityId[s.city]}, ${s.years}, ${s.cr ?? null}, ${s.website ?? null}, ${s.whatsapp ?? s.phone}, ${s.phone}, ${verified ? 'verified' : 'under_review'}, ${verified ? daysAgo(200) : null},
        ${s.rating}, ${s.ratingCount}, ${s.quotations}, ${s.won}, ${s.completed}, ${s.responseMinutes || null}, ${s.minBudget ?? null}, ${s.maxBudget ?? null}, ${s.credits ?? 0}, ${daysAgo(300)})`;
    for (const c of s.categories) {
      await sql`insert into public.supplier_categories (supplier_id, category_id, subcategory_id) values (${id}, ${catId[c.cat]}, null)`;
      for (const sub of c.subs) await sql`insert into public.supplier_categories (supplier_id, category_id, subcategory_id) values (${id}, ${catId[c.cat]}, ${subId[sub]})`;
    }
    for (const city of s.cities) await sql`insert into public.service_areas (supplier_id, city_id) values (${id}, ${cityId[city]})`;
    await sql`insert into public.verification_documents (supplier_id, doc_type, status, reviewed_by, reviewed_at) values (${id}, 'commercial_register', ${verified ? 'approved' : 'pending'}, ${verified ? adminId : null}, ${verified ? daysAgo(200) : null})`;
    if (s.credits) await sql`insert into public.credits (supplier_id, amount, balance_after, reason, note, created_by) values (${id}, ${s.credits}, ${s.credits}, 'promo', 'رصيد ترويجي عند الانضمام', ${adminId})`;
    await sql`insert into public.portfolio_items (supplier_id, title, description_ar, sort_order) values (${id}, ${'مشروع منفذ – ' + s.company}, ${'نموذج من أعمالنا السابقة في ' + CITIES.find((c) => c.slug === s.city)!.name_ar}, 0)`;
    suppliers[s.email] = { id, name: s.name };
  }
  console.log(`users ✓ (admin, ${Object.keys(customers).length} customers, ${Object.keys(suppliers).length} suppliers)`);

  const fahd = customers['customer1@demo.sa'];
  const noura = customers['customer2@demo.sa'];
  const mohammed = customers['customer3@demo.sa'];
  const sup = (email: string) => asUser(suppliers[email].id, 'supplier', suppliers[email].name);
  const cust = (c: { id: string; name: string }) => asUser(c.id, 'customer', c.name);

  // ---- Request 1: signage in Riyadh, receiving quotations + chat
  const r1 = await createRequest(fahd.id, {
    description: 'أحتاج تصميم وتركيب لوحة خارجية لمحل في الرياض. المحل واجهة زجاجية بعرض 6 متر تقريبًا في حي الياسمين، أرغب بحروف بارزة مضيئة على خلفية كلادينج أسود، مع تركيب كامل والتوصيل الكهربائي.',
    title: 'تصميم وتركيب لوحة خارجية لمحل في الرياض',
    categoryId: catId.signage, subcategoryId: subId['outdoor-signs'], cityId: cityId.riyadh,
    budgetMin: 5000, budgetMax: 15000, budgetLabel: '5,000 – 15,000 ر.س', timeline: 'week', urgency: 'normal',
    details: { sign_type: 'outdoor', dimensions: '6 متر × 1.2 متر', lighting: true },
  });
  await sql`update public.requests set created_at = ${daysAgo(3)}, published_at = ${daysAgo(3)} where id = ${r1.id}`;
  await submitQuotation(suppliers['supplier1@demo.sa'].id, r1.id, {
    price: 12500, deliveryDays: 7, validityDays: 14, warranty: 'سنة واحدة على الإضاءة والتركيب',
    details: 'حروف بارزة أكريليك مضيئة بسماكة 3 سم مع إضاءة LED خلفية، خلفية كلادينج أسود مطفي، هيكل حديد مجلفن، وتركيب كامل مع التوصيل الكهربائي.',
    priceIncludes: 'التصميم، التصنيع، الكلادينج، الإضاءة، التركيب، والتوصيل الكهربائي. غير شامل الضريبة.',
    notes: 'يمكن تسليم تصميم ثلاثي الأبعاد للاعتماد خلال يومين.',
  });
  await submitQuotation(suppliers['supplier2@demo.sa'].id, r1.id, {
    price: 9800, deliveryDays: 10, validityDays: 10, warranty: '6 أشهر',
    details: 'لوحة كلادينج مع حروف بارزة مضيئة (أكريليك 2 سم). التصنيع في ورشتنا بالرياض والتركيب بفريقنا.',
    priceIncludes: 'التصنيع والتركيب. الكهرباء من نقطة قريبة على العميل.',
  });
  await submitQuotation(suppliers['supplier3@demo.sa'].id, r1.id, {
    price: 14200, deliveryDays: 5, validityDays: 14, warranty: 'سنتان على الحروف والإضاءة',
    details: 'حروف بارزة أكريليك فاخرة 4 سم مع إضاءة أمامية وخلفية، كلادينج أسود ألمنيوم مركب، وتركيب بواسطة فريقنا في الرياض.',
    priceIncludes: 'كل شيء شامل الضريبة والتوصيل والتركيب.',
  });
  const conv1 = await getOrCreateConversation(r1.id, suppliers['supplier1@demo.sa'].id, cust(fahd));
  await sendMessage(conv1.id, cust(fahd), { body: 'السلام عليكم، هل يشمل السعر تصميم الشعار أم أرسل لكم الملف الجاهز؟' });
  await sendMessage(conv1.id, sup('supplier1@demo.sa'), { body: 'وعليكم السلام، السعر شامل التصميم ثلاثي الأبعاد للوحة. لو عندك ملف الشعار بصيغة AI أو PDF نستخدمه مباشرة.' });
  await sendMessage(conv1.id, sup('supplier1@demo.sa'), { body: 'ولو تحب تتواصل معي مباشرة على 0551000001 أو واتساب' }).catch(() => {});
  await sendMessage(conv1.id, cust(fahd), { body: 'تمام، سأرفع ملف الشعار هنا وبنكمل عبر المنصة.' });
  console.log('request 1 ✓ (3 quotations, chat with filtered message)');

  // ---- Request 2: security cameras in Dammam, waiting for suppliers
  const r2 = await createRequest(noura.id, {
    description: 'أحتاج تركيب نظام كاميرات مراقبة لمستودع في الدمام مساحته 900 متر مع بوابتين، حوالي 12 كاميرا خارجية وداخلية، وأرغب بالمتابعة من الجوال وتخزين 30 يوم.',
    title: 'تركيب نظام كاميرات مراقبة لمستودع في الدمام',
    categoryId: catId.security, subcategoryId: subId.cctv, cityId: cityId.dammam,
    budgetMin: 15000, budgetMax: 50000, budgetLabel: '15,000 – 50,000 ر.س', timeline: 'month', urgency: 'normal',
    details: { site_type: 'warehouse', camera_count: 12, needs_remote: true },
  });
  await sql`update public.requests set created_at = ${daysAgo(1)}, published_at = ${daysAgo(1)} where id = ${r2.id}`;
  console.log('request 2 ✓ (waiting for suppliers)');

  // ---- Request 3: e-commerce store in Jeddah, supplier selected (pending unlock)
  const r3 = await createRequest(mohammed.id, {
    description: 'أحتاج تصميم متجر إلكتروني لبيع العطور في جدة مع ربط بوابة دفع وشركة شحن، وحوالي 150 منتج، ولغتين عربي وإنجليزي.',
    title: 'تصميم متجر إلكتروني لبيع العطور',
    categoryId: catId.web, subcategoryId: subId.ecommerce, cityId: cityId.jeddah,
    budgetMin: 15000, budgetMax: 50000, budgetLabel: '15,000 – 50,000 ر.س', timeline: 'month', urgency: 'normal',
    details: { site_type: 'store', has_brand: true, features: 'دفع إلكتروني، ربط أرامكس، لغتين' },
  });
  await sql`update public.requests set created_at = ${daysAgo(9)}, published_at = ${daysAgo(9)} where id = ${r3.id}`;
  const q3a = await submitQuotation(suppliers['supplier9@demo.sa'].id, r3.id, {
    price: 24000, deliveryDays: 30, validityDays: 21, warranty: '3 أشهر دعم فني مجاني بعد الإطلاق',
    details: 'متجر على منصة سلة (باقة برو) مع تصميم قالب مخصص يعكس هوية العطور، إدخال 150 منتج بصورهم، وربط بوابة الدفع (مدى، أبل باي، STC Pay) وشركة الشحن.',
    priceIncludes: 'التصميم، الإعداد، إدخال المنتجات، الربط، والتدريب على لوحة التحكم. غير شامل اشتراك المنصة السنوي.',
  });
  await submitQuotation(suppliers['supplier10@demo.sa'].id, r3.id, {
    price: 38000, deliveryDays: 45, validityDays: 30, warranty: '6 أشهر صيانة وتحديثات',
    details: 'متجر مخصص مبني بتقنيات حديثة (Next.js) مع لوحة تحكم كاملة، تطبيق ويب سريع، ودعم لغتين، وربط بوابات الدفع والشحن السعودية.',
    priceIncludes: 'التطوير الكامل، الاستضافة للسنة الأولى، والتدريب.',
  });
  const conv3 = await getOrCreateConversation(r3.id, suppliers['supplier9@demo.sa'].id, cust(mohammed));
  await sendMessage(conv3.id, cust(mohammed), { body: 'هل بإمكانكم ربط المتجر مع نظام المحاسبة عندنا لاحقًا؟' });
  await sendMessage(conv3.id, sup('supplier9@demo.sa'), { body: 'نعم، سلة تدعم الربط مع أغلب الأنظمة المحاسبية عبر تطبيقات جاهزة، ونساعدك في الإعداد.' });
  await selectSupplier(mohammed.id, q3a.id);
  console.log('request 3 ✓ (supplier selected, pending unlock)');

  // ---- Request 4: finishing in Riyadh, completed with unlock + review
  const r4 = await createRequest(fahd.id, {
    description: 'تشطيب شقة 180 متر في الرياض حي النرجس: دهانات كاملة، جبس بورد للصالة، وتركيب باركيه لغرفتين.',
    title: 'تشطيب شقة 180 متر في الرياض',
    categoryId: catId.finishing, subcategoryId: subId['full-finishing'], cityId: cityId.riyadh,
    budgetMin: 15000, budgetMax: 50000, budgetLabel: '15,000 – 50,000 ر.س', timeline: 'month', urgency: 'normal',
    details: { finish_type: ['paint', 'gypsum', 'tiles'], area_sqm: 180, property_type: 'apartment' },
  });
  await sql`update public.requests set created_at = ${daysAgo(40)}, published_at = ${daysAgo(40)} where id = ${r4.id}`;
  const q4 = await submitQuotation(suppliers['supplier5@demo.sa'].id, r4.id, {
    price: 32000, deliveryDays: 21, validityDays: 14, warranty: 'سنة على الدهانات والجبس',
    details: 'دهانات جوتن كاملة للشقة، جبس بورد للصالة مع إضاءة مخفية، باركيه ألماني لغرفتين، مع تنظيف نهائي وتسليم.',
    priceIncludes: 'المواد والعمالة والتنظيف بعد التسليم.',
  });
  await submitQuotation(suppliers['supplier4@demo.sa'].id, r4.id, {
    price: 41000, deliveryDays: 25, validityDays: 14, warranty: 'سنتان',
    details: 'تشطيب كامل بإشراف مهندس، دهانات وجبس وباركيه بمواصفات عالية.',
  });
  await getOrCreateConversation(r4.id, suppliers['supplier5@demo.sa'].id, cust(fahd));
  await selectSupplier(fahd.id, q4.id);
  const sel4 = await sql<{ id: string }[]>`select id from public.supplier_selections where request_id = ${r4.id}`;
  await startUnlock(sel4[0].id, suppliers['supplier5@demo.sa'].id, 'credits');
  await sql`update public.requests set status = 'closed', completed_at = ${daysAgo(10)} where id = ${r4.id}`;
  await createReview(fahd.id, r4.id, { quality: 5, communication: 5, priceAccuracy: 4, deliveryTime: 4, overall: 5, comment: 'شغل نظيف والتزام بالمواعيد، الفريق محترف والتعامل ممتاز. أنصح بهم.' });
  console.log('request 4 ✓ (closed, unlocked, reviewed)');

  // ---- Request 5: AC in Jeddah, reviewing quotations
  const r5 = await createRequest(noura.id, {
    description: 'تركيب 6 مكيفات سبليت لفيلا في جدة، الأجهزة موجودة وأحتاج التركيب والتمديدات فقط، والتنفيذ عاجل قبل نهاية الأسبوع.',
    title: 'تركيب 6 مكيفات سبليت لفيلا في جدة',
    categoryId: catId.hvac, subcategoryId: subId.split, cityId: cityId.jeddah,
    budgetMin: null, budgetMax: 5000, budgetLabel: 'أقل من 5,000 ر.س', timeline: 'asap', urgency: 'urgent',
    details: { ac_type: 'split', units: 6 },
  });
  await sql`update public.requests set created_at = ${daysAgo(5)}, published_at = ${daysAgo(5)} where id = ${r5.id}`;
  await submitQuotation(suppliers['supplier11@demo.sa'].id, r5.id, { price: 2700, deliveryDays: 2, validityDays: 7, warranty: 'سنة على التركيب', details: 'تركيب 6 وحدات سبليت مع التمديدات النحاسية حتى 5 متر لكل وحدة وتثبيت الوحدات الخارجية.', priceIncludes: 'العمالة والمواسير والتثبيت.' });
  await submitQuotation(suppliers['supplier12@demo.sa'].id, r5.id, { price: 2100, deliveryDays: 3, validityDays: 7, warranty: '6 أشهر', details: 'تركيب المكيفات الست مع التمديدات الأساسية.', priceIncludes: 'العمالة فقط، المواسير على العميل.' });
  await sql`update public.requests set status = 'reviewing_quotations' where id = ${r5.id}`;
  console.log('request 5 ✓ (reviewing quotations)');

  // ---- Request 6: solar farm in Riyadh, waiting
  const r6 = await createRequest(mohammed.id, {
    description: 'أرغب بتركيب نظام طاقة شمسية لاستراحة في الرياض لتشغيل غاطس بئر و 3 مكيفات وإضاءة، فاتورة الكهرباء حوالي 2500 ريال شهريًا.',
    title: 'نظام طاقة شمسية لاستراحة في الرياض',
    categoryId: catId.solar, subcategoryId: subId['farm-solar'], cityId: cityId.riyadh,
    budgetMin: 50000, budgetMax: 100000, budgetLabel: '50,000 – 100,000 ر.س', timeline: 'flexible', urgency: 'normal',
    details: { property_type: 'farm', monthly_bill: 2500 },
  });
  await sql`update public.requests set created_at = ${daysAgo(2)}, published_at = ${daysAgo(2)} where id = ${r6.id}`;
  console.log('request 6 ✓');

  // pending report for admin demo
  await sql`insert into public.reports (reporter_id, reported_user_id, conversation_id, reason, details) values (${fahd.id}, ${suppliers['supplier1@demo.sa'].id}, ${conv1.id}, 'محاولة مشاركة رقم تواصل', 'المزود حاول إرسال رقم جواله في المحادثة قبل فتح البيانات.')`;

  console.log('\nحسابات التجربة (كلمة المرور لجميع الحسابات: ' + DEMO_PASSWORD + ')');
  console.log('  admin@demo.sa        مدير المنصة');
  console.log('  customer1@demo.sa    عميل (فهد العتيبي)');
  console.log('  customer2@demo.sa    عميل (نورة القحطاني)');
  console.log('  customer3@demo.sa    عميل (محمد الشهري)');
  console.log('  supplier1@demo.sa    مزود: شركة الأفق للوحات الإعلانية (الرياض)');
  console.log('  supplier6@demo.sa    مزود: الدرع الذكي لأنظمة الأمن (الدمام)');
  console.log('  supplier9@demo.sa    مزود: نبض الرقمية (جدة) — لديه عميل اختاره بانتظار فتح البيانات');
  console.log('  supplier5@demo.sa    مزود: لمسات للتشطيبات (الرياض) — مشروع مكتمل ومقيّم');
}

main()
  .then(async () => { await sql.end(); })
  .catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
