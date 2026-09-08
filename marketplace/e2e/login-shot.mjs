import { chromium } from '@playwright/test';
// usage: node e2e/login-shot.mjs <email> <password> <path> <out.png> [width] [height]
const [,, email, password, path, out, width = '1280', height = '900'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: Number(width), height: Number(height) } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 60000 });
await page.fill('input[name=email]', email);
await page.fill('input[name=password]', password);
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60000 }), page.click('button[type=submit]')]);
await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle', timeout: 60000 });
await page.screenshot({ path: out, fullPage: true });
console.log('url:', page.url(), '| errors:', errors.length ? errors : 'none');
await browser.close();
