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
  
  // 直接通过 URL 导航，数据源已选中
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
  
  // 使用 Playwright 的拖拽 - 从 list-item_primary 拖到 table-preview
  const tableItem = page.locator('.list-item_primary').first();
  const dropTarget = page.locator('.table-preview').first();
  
  try {
    // 尝试 dragTo
    await tableItem.dragTo(dropTarget, { 
      sourcePosition: { x: 10, y: 20 },
      targetPosition: { x: 200, y: 100 }
    });
    console.log('  dragTo executed');
  } catch(e) {
    console.log('  dragTo failed:', e.message.substring(0, 100));
    
    // 手动拖拽
    const srcBox = await tableItem.boundingBox();
    const tgtBox = await dropTarget.boundingBox();
    if (srcBox && tgtBox) {
      await page.mouse.move(srcBox.x + 10, srcBox.y + 20);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.move(tgtBox.x + 200, tgtBox.y + 100, { steps: 15 });
      await page.waitForTimeout(100);
      await page.mouse.up();
      console.log('  manual drag executed');
    }
  }
  
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `/tmp/ds_${name}.png`, fullPage: true });
  
  // 检查中间区域
  const previewText = await page.evaluate(() => {
    return document.querySelector('.table-preview')?.textContent?.trim()?.substring(0, 200);
  });
  console.log(`  Preview: "${previewText}"`);
  
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
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 只测试第一个
  await createDataset(page, TABLES[0]);
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
