import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';

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

async function goToDatasetList(page) {
  // 先回到工作台
  await page.goto(BASE + '/#/workbranch/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('.tree-header', { timeout: 8000 });
}

async function createOneDataset(page, { name, label }) {
  console.log(`\n--- ${label} (${name}) ---`);
  
  // 点击新建数据集
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 1. 设置名称
  await page.evaluate((n) => {
    const span = document.querySelector('.dataset-name.ellipsis');
    if (span) span.textContent = n;
  }, label);
  console.log(`  Name set: ${label}`);
  
  // 2. 选择数据源
  const dsInput = page.locator('.table-list-top .ed-select__input').first();
  await dsInput.click();
  await page.waitForTimeout(1000);
  
  // 点击"新辰未来"
  const xcOption = page.locator('.ed-select-dropdown__item, .ed-tree-node__content').filter({ hasText: '新辰未来' }).first();
  await xcOption.click({ force: true });
  await page.waitForTimeout(2000);
  console.log('  Selected 新辰未来');
  
  // 3. 搜索并添加表
  const tableSearch = page.locator('input[placeholder*="表名称"]').first();
  await tableSearch.fill(name);
  await page.waitForTimeout(2000);
  
  // 双击搜索结果中的表
  const tableItem = page.locator('span, div').filter({ hasText: new RegExp(`^${name}$`) }).first();
  if (await tableItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tableItem.dblclick();
    await page.waitForTimeout(2000);
    console.log(`  Table ${name} added`);
  } else {
    // 尝试用精确文本匹配
    const exactItem = page.locator(`text="${name}"`).first();
    if (await exactItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exactItem.dblclick();
      await page.waitForTimeout(2000);
      console.log(`  Table ${name} added (exact)`);
    } else {
      console.log(`  Table ${name} not found in search results`);
    }
  }
  
  await page.screenshot({ path: `/tmp/ds_final_${name}.png`, fullPage: true });
  
  // 4. 保存
  const saveBtn = page.locator('button').filter({ hasText: /^保存$/ }).first();
  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
    
    // 检查结果
    const currentUrl = page.url();
    const messages = await page.locator('[class*="message"]').all();
    for (const msg of messages) {
      const text = (await msg.textContent().catch(() => ''))?.trim();
      if (text) console.log(`  Msg: ${text}`);
    }
    
    if (currentUrl.includes('dataset-form')) {
      console.log('  WARNING: Still on form, might have failed');
    } else {
      console.log('  Saved successfully!');
    }
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const table of TABLES) {
    try {
      await goToDatasetList(page);
      await createOneDataset(page, table);
      successCount++;
    } catch(e) {
      console.error(`  ERROR: ${e.message}`);
      failCount++;
      await page.screenshot({ path: `/tmp/error_final_${table.name}.png`, fullPage: true });
    }
  }
  
  await browser.close();
  console.log(`\n=== Result: ${successCount} success, ${failCount} failed ===`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
