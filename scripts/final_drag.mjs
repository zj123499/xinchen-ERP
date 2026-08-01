import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const DS_ID = '1273399598202884096';

async function login(page) {
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  if (page.url().includes('login')) {
    const inputs = await page.locator('input').all();
    await inputs[0].fill(USER);
    await inputs[1].fill(PASS);
    await page.locator('.ed-button.submit, button:has-text("Login")').first().click();
    await page.waitForTimeout(3000);
  }
}

async function createDataset(page, { name, label }) {
  console.log(`\n--- ${label} (${name}) ---`);
  
  await page.goto(`${BASE}/#/dataset-form?datasourceId=${DS_ID}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 设置名称
  await page.evaluate((n) => {
    document.querySelector('.dataset-name.ellipsis').textContent = n;
  }, label);
  
  // 搜索表
  const tableSearch = page.locator('input[placeholder*="表名称"]').first();
  await tableSearch.fill(name);
  await page.waitForTimeout(2000);
  
  // 拖拽目标使用始终可见的 .field-data 区域
  const tableItem = page.locator('.list-item_primary').first();
  const dropTarget = page.locator('.field-data').first();
  
  // 使用 force 选项
  await tableItem.dragTo(dropTarget, { force: true });
  console.log('  dragTo executed');
  
  await page.waitForTimeout(2000);
  
  // 检查结果
  const centerText = await page.evaluate(() => {
    const fd = document.querySelector('.field-data');
    return fd?.textContent?.trim()?.substring(0, 200);
  });
  console.log(`  Center: "${centerText}"`);
  
  // 保存
  const saveBtn = page.locator('button').filter({ hasText: /^保存$/ }).first();
  await saveBtn.click();
  await page.waitForTimeout(3000);
  
  const msgs = await page.locator('[class*="message"]').all();
  for (const m of msgs) {
    const t = (await m.textContent().catch(() => ''))?.trim();
    if (t) console.log(`  Msg: ${t}`);
  }
  console.log(`  URL: ${page.url()}`);
}

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-gpu', '--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  await createDataset(page, { name: 'rebates', label: '返佣记录' });
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
