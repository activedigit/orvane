import { chromium } from '@playwright/test';
const [,, email, password, outDir, ...paths] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('input[name=email]', email);
await page.fill('input[name=password]', password);
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60000 }), page.click('button[type=submit]')]);
for (const p of paths) {
  const res = await page.goto('http://localhost:3000' + p, { waitUntil: 'networkidle', timeout: 90000 });
  const title = await page.title();
  console.log(res.status(), p, '|', title.slice(0, 40), errors.length ? '| ERR ' + errors.join(' / ') : '');
  errors.length = 0;
  if (outDir) await page.screenshot({ path: `${outDir}/${p.replace(/[\/\[\]]/g, '_') || 'root'}.png`, fullPage: true });
}
await browser.close();
