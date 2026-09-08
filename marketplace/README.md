# عروض — منصة عروض الأسعار الخاصة (Saudi quotation marketplace)

منصة عربية (RTL) تعمل كسوق مناقصات خاص: العميل يكتب ما يحتاجه مرة واحدة، النظام يفهم الطلب ويسأل عن التفاصيل الناقصة ويصنّفه، ثم يرسله فقط للمزودين الموثّقين المناسبين. المزودون يقدمون عروضًا خاصة، العميل يقارن ويتحدث بشكل مجهول ويختار، والمزود يدفع لفتح بيانات التواصل **فقط بعد أن يختاره العميل**.

> العميل يطلب مرة واحدة، الشركات المناسبة تقدم عروضها، والعميل هو من يختار.

## المحتويات

- [التقنيات](#التقنيات)
- [التشغيل المحلي (بدون Supabase)](#التشغيل-المحلي-بدون-supabase)
- [التشغيل مع Supabase](#التشغيل-مع-supabase)
- [الحسابات التجريبية](#الحسابات-التجريبية)
- [هيكل المشروع](#هيكل-المشروع)
- [الأمان ومنع الالتفاف](#الأمان-ومنع-الالتفاف)
- [الطبقات القابلة للاستبدال](#الطبقات-القابلة-للاستبدال)
- [الاختبارات](#الاختبارات)
- [النشر](#النشر)

## التقنيات

| الطبقة | التقنية |
| --- | --- |
| الواجهة | Next.js 15 (App Router, Server Actions), React 19, TypeScript, Tailwind CSS 4, Radix UI, lucide-react, sonner |
| الخط | IBM Plex Sans Arabic (عبر `next/font`) |
| قاعدة البيانات | PostgreSQL (Supabase Postgres أو أي PostgreSQL 15+) عبر `postgres.js` مع SQL صريح، UUIDs، فهارس، علاقات، RLS |
| المصادقة | Supabase Auth (بريد/كلمة مرور، OTP جوال، Google/Apple جاهزة) **أو** مزود محلي (bcrypt + JWT cookie) للتشغيل بدون Supabase |
| التخزين | Supabase Storage (bucket خاص) أو مجلد محلي؛ كل الملفات تُقدَّم عبر مسار مصرح `/api/files/[id]` |
| المحادثة | Polling عبر API + اشتراك Supabase Realtime اختياري |
| الذكاء الاصطناعي | تجريد `AiProvider`: محرك قواعد يعمل بدون إنترنت + مزود LLM (Anthropic) اختياري مع رجوع تلقائي للقواعد |
| الدفع | تجريد `PaymentGateway`: بوابة تجريبية مدمجة + هيكل Moyasar (مدى، Apple Pay، Visa/Mastercard، STC Pay) |

## التشغيل المحلي (بدون Supabase)

يحتاج فقط Node.js 20+ و PostgreSQL محلي.

```bash
cd marketplace
npm install
cp .env.example .env.local
# عدّل DATABASE_URL ليشير إلى قاعدة PostgreSQL فارغة، مثال:
# DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/orood
# AUTH_PROVIDER=local  STORAGE_PROVIDER=local  PAYMENT_GATEWAY=mock

npm run db:setup      # يطبق الهجرات ثم يزرع بيانات تجريبية عربية كاملة
npm run dev           # http://localhost:3000
```

أوامر قاعدة البيانات:

| الأمر | الوظيفة |
| --- | --- |
| `npm run db:migrate` | تطبيق ملفات `supabase/migrations/*.sql` بالترتيب (الملفات `*.supabase.sql` تُطبق فقط عند وجود schema `auth`) |
| `npm run db:seed` | زرع البيانات التجريبية (يفشل إذا كانت هناك بيانات) |
| `npm run db:reset` | حذف كل البيانات وإعادة الزرع |

## التشغيل مع Supabase

1. أنشئ مشروع Supabase، وفعّل مزود البريد/كلمة المرور في Authentication. للتجربة السريعة عطّل "Confirm email".
2. أنشئ bucket خاصًا باسم `private` في Storage.
3. في `.env.local`:
   ```
   DATABASE_URL=<Session pooler connection string>
   AUTH_PROVIDER=supabase
   STORAGE_PROVIDER=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
4. `npm run db:migrate` — سيطبق أيضًا `0002_supabase_auth.supabase.sql` (ربط `public.users` بـ `auth.users` + trigger) و `0003_rls.supabase.sql` (سياسات RLS + نشر جداول الرسائل والإشعارات في Realtime).
5. `npm run db:reset` — ينشئ الحسابات التجريبية عبر Supabase Admin API.
6. `npm run dev`.

يمكن أيضًا لصق ملفات الهجرة في SQL Editor بنفس الترتيب.

**ملاحظة عن الصلاحيات:** كل الكتابة تمر عبر Server Actions بعد تحقق صريح من الصلاحيات على الخادم. RLS طبقة إضافية للقراءة من المتصفح (Realtime والإشعارات) ولحماية البيانات إذا استُخدم المفتاح العام مباشرة.

## الحسابات التجريبية

كلمة المرور لجميع الحسابات: `Demo@1234`

| البريد | الدور | ماذا تجرب |
| --- | --- | --- |
| `customer1@demo.sa` | عميل (فهد) | طلب لوحة في الرياض عليه 3 عروض ومحادثة (فيها رسالة تم إخفاء رقم فيها) + مشروع مكتمل مُقيَّم |
| `customer2@demo.sa` | عميل (نورة) | طلب كاميرات بانتظار العروض + طلب تكييف في مرحلة المراجعة |
| `customer3@demo.sa` | عميل (محمد) | متجر إلكتروني تم اختيار مزود له بانتظار فتح البيانات |
| `supplier1@demo.sa` | مزود لوحات (الرياض) | استقبال طلبات، تقديم عرض، محادثة |
| `supplier9@demo.sa` | مزود مواقع (جدة) | لديه عميل اختاره → جرّب "فتح بيانات العميل" والدفع التجريبي |
| `supplier6@demo.sa` | مزود أمن (الدمام) | طلب كاميرات جديد بانتظار عرضه |
| `admin@demo.sa` | مدير | لوحة الإدارة كاملة |

المسار الكامل للتجربة: افتح الصفحة الرئيسية → اكتب طلبًا (مثال: "أحتاج تصميم وتركيب لوحة خارجية لمحل في الرياض") → أجب عن الأسئلة → أنشئ حساب عميل من داخل المعالج → افتح `supplier1@demo.sa` في متصفح آخر وقدّم عرضًا → قارن العروض واختر → ادخل كمزود وافتح البيانات بالدفع التجريبي → تظهر بيانات التواصل للطرفين → أكمل المشروع وقيّم.

## هيكل المشروع

```
marketplace/
├── supabase/migrations/        # 0001 المخطط (كل قواعد البيانات) • 0002 ربط Supabase Auth • 0003 RLS + Realtime
├── scripts/                    # migrate.ts, seed.ts (بيانات عربية واقعية عبر خدمات المنصة نفسها)
├── e2e/                        # اختبارات متصفح Playwright (full-flow.mjs يغطي المسار كاملًا)
├── tests/                      # اختبارات وحدات (vitest): فلتر التواصل، المطابقة، التسعير، الاستبيان
└── src/
    ├── app/                    # الصفحات (App Router)
    │   ├── (marketing)/        # الرئيسية، كيف تعمل، الخدمات، الأسعار، الأسئلة، تواصل، الشروط، الخصوصية، ملف المزود العام
    │   ├── (auth)/             # الدخول، التسجيل (عميل/مزود)
    │   ├── requests/new        # المعالج الحواري لإنشاء الطلب
    │   ├── dashboard/          # لوحة العميل
    │   ├── supplier/           # لوحة المزود (الطلبات المناسبة، عروضي، العملاء المختارون، الرصيد، الاشتراك، الملف التجاري…)
    │   ├── admin/              # لوحة الإدارة (المستخدمون، التوثيق، الفئات، المدن، الطلبات، العروض، المحادثات، المدفوعات، الأسعار، …)
    │   ├── chat/[id]           # المحادثة الخاصة
    │   ├── pay/[id]            # صفحة الدفع التجريبية + مسار العودة من البوابة
    │   └── api/                # upload, files/[id] (مصرح), chat/[id]/messages (polling)
    ├── actions/                # Server Actions (تحقق zod + صلاحيات + rate limit)
    ├── components/             # ui (نظام التصميم)، layout، request، quotation، chat، supplier، admin…
    └── lib/
        ├── db/                 # عميل postgres.js + الأنواع
        ├── auth/               # تجريد المصادقة: local + supabase، حراس الصلاحيات
        ├── storage/            # تجريد التخزين: local + supabase
        ├── moderation/         # text-filter (منع الالتفاف) + image-pipeline (OCR/QR/blur جاهزة للربط)
        ├── ai/                 # AiProvider: rules + anthropic
        ├── payments/           # PaymentGateway: mock + moyasar
        ├── notifications/      # القنوات: in-app + email/whatsapp/push (adapters)
        ├── security/           # rate limiting + security events
        ├── requests/           # محرك الاستبيان الحواري
        └── services/           # منطق الأعمال: requests, matching, quotations, chat, selection, unlock, pricing, reviews, suppliers, admin…
```

## الأمان ومنع الالتفاف

- **الصلاحيات على الخادم فقط**: كل action/صفحة تستدعي `requireRole`/`requirePageRole`. العميل يرى طلباته فقط، والمزود يرى الطلبات المطابقة له فقط (`request_matches`)، والمرفقات تُقدَّم بعد فحص العلاقة في `canViewFile`.
- **بيانات التواصل مقفلة**: `getCustomerContactForSupplier` و`getSupplierContactForCustomer` لا تُرجع شيئًا إلا بوجود صف في `lead_unlocks`. استعلامات العرض العام للمزود تختار أعمدة عامة فقط وتُخفي الهوية داخل SQL نفسه عند تفعيل وضع الخصوصية، فلا تخرج البيانات الخاصة من قاعدة البيانات أصلًا.
- **فلتر الرسائل (server-side)** في `lib/moderation/text-filter.ts`: أرقام الجوال (بمسافات/شرطات، أرقام عربية ٠-٩، كلمات عربية وإنجليزية)، بريد، روابط، حسابات تواصل (@، انستقرام/سناب/تيليجرام…). يُستبدل المحتوى بـ "تم إخفاء معلومات التواصل لحماية عملية التعاقد." ويُسجل في `moderation_logs` و`security_events`. يُطبق على الرسائل، نصوص العروض، التقييمات، وأسماء الملفات.
- **خط معالجة الصور** `lib/moderation/image-pipeline.ts`: واجهات `OcrProvider` / `QrDetector` / `ImageRedactor` مع تطبيقات فارغة افتراضيًا؛ اربط Google Vision / Tesseract / ZXing / sharp دون تغيير مواضع الاستدعاء.
- **Rate limiting** لكل من الدخول، التسجيل، إنشاء الطلبات، الرسائل، العروض، الرفع (`lib/security/rate-limit.ts` — استبدل بـ Redis للتوسع).
- **RLS** على كل الجداول في Supabase، ولا يُخزَّن النص الأصلي للرسائل في جدول `messages` (فقط في `moderation_logs` المتاح للإدارة).

## الطبقات القابلة للاستبدال

| الطبقة | الواجهة | التطبيقات | كيفية التبديل |
| --- | --- | --- | --- |
| المصادقة | `lib/auth/types.ts` | `local`, `supabase` | `AUTH_PROVIDER` |
| التخزين | `lib/storage/provider.ts` | `local`, `supabase` | `STORAGE_PROVIDER` |
| الذكاء الاصطناعي | `lib/ai/types.ts` | `rules`, `anthropic` | `AI_PROVIDER` + `ANTHROPIC_API_KEY` |
| الدفع | `lib/payments/gateway.ts` | `mock`, `moyasar` | `PAYMENT_GATEWAY` |
| الإشعارات | `lib/notifications/channels.ts` | console adapters | `EMAIL_ENABLED` … واستبدل `send` |
| OCR/QR | `lib/moderation/image-pipeline.ts` | noop | `getImagePipelineOptions()` |

التسعير يقرأ من جدول `lead_pricing_rules` (حسب الفئة وقيمة المشروع) وجدول `admin_settings`، ويُدار من لوحة الإدارة دون تعديل الكود. نماذج التسعير المدعومة: دفع لكل عميل مختار، اشتراك شهري (`subscriptions`)، رصيد نقاط (`credits`)، نقاط ترويجية.

## الاختبارات

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # vitest: فلتر التواصل، المطابقة، التسعير، الاستبيان
npm run build       # بناء إنتاجي

# اختبار المتصفح الكامل (يحتاج خادمًا يعمل وبيانات مزروعة):
node e2e/full-flow.mjs                     # ضد http://localhost:3000
BASE_URL=http://localhost:3001 node e2e/full-flow.mjs
```

`e2e/full-flow.mjs` يغطي: المعالج الحواري → التسجيل داخل المعالج → إرسال الطلب ومطابقته → عرض المزود (مع إخفاء رقم داخل النص) → محادثة مجهولة (إخفاء رقم بأرقام عربية) → اختيار المزود → فتح البيانات بالدفع التجريبي → ظهور بيانات التواصل للطرفين → إكمال المشروع والتقييم → التأكد من أن مزودًا آخر يحصل على 404.

## النشر

- Vercel أو أي استضافة Node مع `npm run build && npm start`.
- في الإنتاج: `AUTH_PROVIDER=supabase`، `STORAGE_PROVIDER=supabase`، `PAYMENT_GATEWAY=moyasar` مع المفاتيح، وضبط `NEXT_PUBLIC_APP_URL`.
- الـ rate limiter الافتراضي في الذاكرة؛ عند تعدد النسخ استخدم `setRateLimiter` بتطبيق Redis.
