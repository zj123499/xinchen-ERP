import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const DS_ID = '1273399598202884096';

const TABLES = [
  { name: 'rebates', label: '返佣记录' },
  { name: 'commission_details', label: '佣金明细' },
  { name: 'employees', label: '员工信息' },
  { name: 'partners', label: '合作伙伴' },
  { name: 'assets', label: '资产管理' },
  { name: 'expenses', label: '费用支出' },
  { name: 'students', label: '学生信息' },
  { name: 'follow_up_records', label: '跟进记录' },
  { name: 'contracts', label: '合同管理' },
  { name: 'payments', label: '付款记录' },
  { name: 'enrollment', label: '报名注册' },
  { name: 'offers', label: '录取通知' },
  { name: 'applications', label: '申请记录' },
  { name: 'visas', label: '签证管理' },
];

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
  
  // 使用 Playwright 内置拖拽
  const tableItem = page.locator('.list-item_primary').first();
  const dropTarget = page.locator('.table-preview').first();
  
  await tableItem.dragTo(dropTarget);
  console.log('  dragTo executed');
  
  await page.waitForTimeout(2000);
  
  // 保存
  const saveBtn = page.locator('button').filter({ hasText: /^保存$/ }).first();
  await saveBtn.click();
  await page.waitForTimeout(3000);
  
  const msgs = await page.locator('[class*="message"]').all();
  for (const m of msgs) {
    const t = (await m.textContent().catch(() => ''))?.trim();
    if (t) console.log(`  Msg: ${t}`);
  }
  console.log(`  Saved: ${!page.url().includes('dataset-form')}`);
}

async function main() {
  // 使用 channel: 'chrome' 支持更好的拖拽
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-gpu', '--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  await createDataset(page, TABLES[0]);
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
