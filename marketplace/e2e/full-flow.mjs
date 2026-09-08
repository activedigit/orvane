/**
 * Browser end-to-end test of the core flow against a running dev server:
 * customer registers inside the wizard -> request created & dispatched ->
 * supplier submits a private quotation -> anonymous chat masks a phone number ->
 * customer selects the supplier -> supplier unlocks via mock payment ->
 * both sides see contact details -> customer completes and reviews.
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const stamp = Date.now().toString().slice(-6);
const customer = { email: `e2e-${stamp}@demo.sa`, password: 'Demo@1234', name: 'سعد الغامدي', phone: `05${stamp}000`.slice(0, 10) };
const supplier = { email: 'supplier1@demo.sa', password: 'Demo@1234' };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const step = (s) => console.log('✔', s);
const fail = (s) => { console.error('✖', s); process.exitCode = 1; };
const assert = (c, s) => (c ? step(s) : fail(s));

async function login(page, { email, password }) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60000 }), page.click('button[type=submit]')]);
}

try {
  // ---------- Customer: wizard (anonymous) -> register inline -> submit
  const cctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const c = await cctx.newPage();
  await c.goto(`${BASE}/requests/new?text=${encodeURIComponent('أحتاج تصميم وتركيب لوحة خارجية مضيئة لمحل في الرياض بعرض 5 متر')}`, { waitUntil: 'networkidle' });
  await c.click('button:has-text("متابعة")');
  await c.waitForSelector('text=فهمنا طلبك', { timeout: 60000 });
  step('wizard analyzed the free text');
  // answer questions until account step
  for (let i = 0; i < 12; i++) {
    if (await c.locator('text=خطوة أخيرة').count()) break;
    const q = c.locator('h3').filter({ hasText: /./ }).last();
    const prompt = (await q.textContent()) || '';
    if (await c.locator('button:has-text("تخطي هذا السؤال")').count()) { await c.click('button:has-text("تخطي هذا السؤال")'); continue; }
    if (await c.locator('button:has-text("نعم")').count()) { await c.click('button:has-text("نعم")'); continue; }
    const opt = c.locator('div.fade-up button').filter({ hasNotText: /متابعة|تخطي|رجوع/ }).first();
    if (await opt.count()) { await opt.click(); continue; }
    const cont = c.locator('div.fade-up button:has-text("متابعة")');
    if (await cont.count()) { await cont.click(); continue; }
    fail(`unhandled question: ${prompt}`);
    break;
  }
  await c.waitForSelector('text=خطوة أخيرة', { timeout: 30000 });
  step('questionnaire completed, account step reached');
  await c.fill('input[name=fullName]', customer.name);
  await c.fill('input[name=phone]', customer.phone);
  await c.fill('input[name=email]', customer.email);
  await c.fill('input[name=password]', customer.password);
  await Promise.all([c.waitForURL(/resume=1/, { timeout: 60000 }), c.click('button:has-text("إنشاء الحساب")')]);
  await c.waitForSelector('text=راجع طلبك قبل الإرسال', { timeout: 60000 });
  step('registered inline and draft restored');
  await c.click('button:has-text("إرسال الطلب للمزودين المناسبين")');
  await c.waitForSelector('text=تم تجهيز طلبك', { timeout: 60000 });
  step('request submitted');
  await c.waitForURL(/\/dashboard\/requests\//, { timeout: 60000 });
  const requestUrl = c.url();
  const requestId = requestUrl.split('/').pop();
  await c.waitForSelector('text=بانتظار عروض المزودين', { timeout: 60000 });
  const matchedText = await c.locator('text=/أُرسل إلى \\d+ مزودين/').textContent();
  assert(/أُرسل إلى [1-9]/.test(matchedText || ''), `request dispatched to suppliers (${matchedText})`);

  // ---------- Supplier: sees request, submits quotation
  const sctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const s = await sctx.newPage();
  await login(s, supplier);
  await s.goto(`${BASE}/supplier/requests/${requestId}`, { waitUntil: 'networkidle' });
  assert((await s.locator('text=قدّم عرضك الخاص').count()) > 0, 'supplier can open the matched request');
  assert((await s.locator(`text=${customer.name}`).count()) === 0 && (await s.content()).indexOf(customer.phone) === -1, 'customer identity hidden from supplier');
  await s.fill('input[name=price]', '11800');
  await s.fill('input[name=deliveryDays]', '6');
  await s.fill('textarea[name=details]', 'حروف بارزة مضيئة أكريليك 3 سم مع كلادينج، شامل التركيب. للتواصل 0551000001');
  await s.fill('input[name=warranty]', 'سنة');
  await s.click('button:has-text("إرسال العرض")');
  await s.waitForSelector('text=عرضك', { timeout: 60000 });
  await s.waitForTimeout(1500);
  step('supplier submitted a quotation');

  // ---------- Customer: sees quotation with masked contact, chats, gets masked
  await c.reload({ waitUntil: 'networkidle' });
  await c.waitForSelector('text=11,800', { timeout: 60000 });
  const html = await c.content();
  if (html.includes('0551000001') || html.includes('شركة الأفق')) { const fs = await import('node:fs'); fs.writeFileSync(process.env.SCRATCH + '/afterQuote.html', html); const i = html.indexOf('0551000001'); console.log('CTX1:', html.slice(Math.max(0, i - 300), i + 40).replace(/\s+/g, ' ')); const j = html.indexOf('شركة الأفق'); console.log('CTX2:', html.slice(Math.max(0, j - 300), j + 40).replace(/\s+/g, ' ')); }
  assert(!html.includes('0551000001'), 'phone number inside quotation text was masked');
  assert(html.includes('شركة متخصصة') && !html.includes('شركة الأفق'), 'supplier identity hidden before selection (privacy mode)');
  await c.click('button:has-text("محادثة مع المزود")');
  await c.waitForURL(/\/chat\//, { timeout: 60000 });
  const chatUrl = c.url();
  await c.fill('textarea', 'هل ممكن نتواصل واتساب على ٠٥٥١٢٣٤٥٦٧ ؟');
  await c.keyboard.press('Enter');
  await c.waitForSelector('text=تم إخفاء معلومات التواصل', { timeout: 30000 });
  const chatHtml = await c.content();
  assert(!chatHtml.includes('٠٥٥١٢٣٤٥٦٧') && !chatHtml.includes('0551234567'), 'Arabic-digit phone masked in chat');
  step('anonymous chat works and masks contact info');

  // supplier replies
  await s.goto(chatUrl, { waitUntil: 'networkidle' });
  await s.fill('textarea', 'أهلًا، نكمل هنا عبر المنصة وأرسل لك التصميم خلال يومين.');
  await s.keyboard.press('Enter');
  await s.waitForTimeout(1500);
  await c.waitForSelector('text=نكمل هنا عبر المنصة', { timeout: 30000 });
  step('customer received supplier reply (polling)');

  // ---------- Customer selects supplier
  await c.goto(requestUrl, { waitUntil: 'networkidle' });
  await c.click('button:has-text("أرغب بالتعامل مع هذا المزود")');
  await c.waitForSelector('text=هل ترغب بالانتقال للمرحلة التالية', { timeout: 30000 });
  await c.click('button:has-text("نعم، اختر هذا المزود")');
  await c.waitForSelector('text=ستصلك بياناته فور فتحه للتواصل', { timeout: 60000 });
  step('customer selected the supplier');
  await c.reload({ waitUntil: 'networkidle' });
  await c.waitForSelector('text=بمجرد أن يفتح المزود بيانات التواصل', { timeout: 60000 });
  const afterSelect = await c.content();
  assert(afterSelect.includes('شركة الأفق'), 'supplier identity revealed after selection');
  if (afterSelect.includes('0551000001')) { const i = afterSelect.indexOf('0551000001'); console.log('CONTEXT:', afterSelect.slice(Math.max(0, i - 400), i + 60).replace(/\s+/g, ' ')); }
  assert(!afterSelect.includes('0551000001'), 'supplier phone still hidden before unlock');

  // ---------- Supplier: lead pending -> unlock via mock payment
  await s.goto(`${BASE}/supplier/leads`, { waitUntil: 'networkidle' });
  await s.click(`a:has-text("${await c.locator('h1').first().textContent()}")`);
  await s.waitForSelector('text=مبروك! العميل اختار عرضك', { timeout: 60000 });
  assert((await s.content()).indexOf(customer.phone) === -1, 'customer phone hidden before unlock');
  await s.click('button:has-text("دفع مباشر")');
  await s.click('button:has-text("فتح بيانات العميل")');
  await s.click('button:has-text("تأكيد")');
  await s.waitForURL(/\/pay\//, { timeout: 60000 });
  await s.click('button:has-text("إتمام الدفع (نجاح)")');
  await s.waitForURL(/\/supplier\/leads\//, { timeout: 60000 });
  await s.waitForSelector('text=بيانات العميل', { timeout: 60000 });
  const leadHtml = await s.content();
  assert(leadHtml.includes(customer.phone) && leadHtml.includes(customer.name), 'supplier sees customer contact after payment');
  step('mock payment succeeded and lead unlocked');

  // ---------- Customer sees supplier contact, completes, reviews
  await c.goto(requestUrl, { waitUntil: 'networkidle' });
  const finalHtml = await c.content();
  assert(finalHtml.includes('0551000001') && finalHtml.includes('بيانات المزود الذي اخترته'), 'customer sees supplier contact after unlock');
  await c.click('button:has-text("تم إنجاز المشروع")');
  await c.waitForSelector('text=كيف كانت تجربتك مع المزود', { timeout: 60000 });
  const stars = c.locator('button[role=radio][aria-label="5 من 5"]');
  const n = await stars.count();
  for (let i = 0; i < n; i++) await stars.nth(i).click();
  await c.fill('textarea', 'تعامل ممتاز وتسليم في الوقت.');
  await c.click('button:has-text("إرسال التقييم")');
  await c.waitForSelector('text=تقييمك للمزود', { timeout: 60000 });
  step('customer completed the project and left a review');

  // ---------- Security: another supplier cannot read this request / chat
  const octx = await browser.newContext();
  const o = await octx.newPage();
  await login(o, { email: 'supplier6@demo.sa', password: 'Demo@1234' });
  const r1 = await o.goto(`${BASE}/supplier/requests/${requestId}`);
  const r2 = await o.goto(chatUrl);
  assert(r1.status() === 404 && r2.status() === 404, 'unrelated supplier gets 404 for request and chat');
  await octx.close();
  await cctx.close();
  await sctx.close();
} catch (e) {
  fail(`exception: ${e.message}`);
  try { for (const ctx of browser.contexts()) for (const [i, pg] of ctx.pages().entries()) await pg.screenshot({ path: `${process.env.SCRATCH || '.'}/fail-${i}-${Date.now()}.png`, fullPage: true }); } catch {}
} finally {
  await browser.close();
}
console.log(process.exitCode ? '\nFLOW FAILED' : '\nFULL FLOW PASSED');
