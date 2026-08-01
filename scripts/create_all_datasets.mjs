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

async function navigateToDataset(page) {
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('.tree-header', { timeout: 8000 });
}

async function createDataset(page, tableInfo) {
  console.log(`\n=== ${tableInfo.label} (${tableInfo.name}) ===`);
  
  // 点击新建数据集按钮
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 1. 设置数据集名称 - 点击"未命名数据集"并修改
  const nameSpan = page.locator('.dataset-name.ellipsis').first();
  await nameSpan.click();
  await page.waitForTimeout(500);
  
  // 点击后应该出现 input，填写名称
  const nameInput = page.locator('input.ed-input__inner').filter({ hasText: '' }).first();
  // 也可能出现新的 input，尝试多种方式
  const allVisibleInputs = page.locator('input:visible').filter({ hasText: '' });
  const inputCount = await allVisibleInputs.count();
  
  let nameFilled = false;
  for (let i = 0; i < Math.min(inputCount, 5); i++) {
    const inp = allVisibleInputs.nth(i);
    const val = await inp.inputValue().catch(() => '');
    const placeholder = await inp.getAttribute('placeholder').catch(() => '');
    const type = await inp.getAttribute('type').catch(() => '');
    
    if (!type || type === 'text') {
      // 检查是否是名称编辑框（通常在顶部）
      const rect = await inp.boundingBox().catch(() => null);
      if (rect && rect.y < 100) {
        await inp.fill(tableInfo.label);
        nameFilled = true;
        console.log(`  Name set: ${tableInfo.label}`);
        break;
      }
    }
  }
  
  if (!nameFilled) {
    // 如果没找到顶部输入框，尝试点击名称区域后直接 type
    await nameSpan.click();
    await page.waitForTimeout(500);
    await page.keyboard.press('Control+a');
    await page.keyboard.type(tableInfo.label);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log(`  Name set via keyboard: ${tableInfo.label}`);
  }
  
  // 2. 选择数据源
  const dsSelect = page.locator('.select-ds').first();
  if (await dsSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dsSelect.click();
    await page.waitForTimeout(1000);
    
    // 查找"新辰未来"选项
    const xcOption = page.locator('.ed-select-dropdown__item, li').filter({ hasText: '新辰未来' }).first();
    if (await xcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await xcOption.click();
      await page.waitForTimeout(2000);
      console.log('  Selected 新辰未来');
    } else {
      console.log('  Could not find 新辰未来 option');
    }
  }
  
  // 3. 搜索并选择数据表
  const tableSearch = page.locator('input[placeholder*="表名称"]').first();
  if (await tableSearch.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tableSearch.fill(tableInfo.name);
    await page.waitForTimeout(2000);
    console.log(`  Searched: ${tableInfo.name}`);
    
    // 等待搜索结果，然后点击表名或拖拽
    // 查找包含表名的列表项
    const tableItem = page.locator('span, div, li').filter({ hasText: new RegExp(`^${tableInfo.name}$`) }).first();
    if (await tableItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 双击表名将其添加到数据集
      await tableItem.dblclick();
      await page.waitForTimeout(2000);
      console.log('  Table added to dataset');
    }
  }
  
  await page.screenshot({ path: `/tmp/ds_${tableInfo.name}.png`, fullPage: true });
  
  // 4. 保存数据集
  const saveBtn = page.locator('button').filter({ hasText: /^保存$/ }).first();
  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
    console.log('  Saved!');
    
    // 检查保存结果
    const successMsg = page.locator('[class*="message"], [class*="notification"], [class*="toast"]').first();
    const msgText = await successMsg.textContent().catch(() => '');
    if (msgText) console.log(`  Message: ${msgText}`);
  } else {
    console.log('  Save button not found');
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  await navigateToDataset(page);
  
  for (const table of TABLES) {
    try {
      await createDataset(page, table);
    } catch(e) {
      console.error(`  Error creating ${table.label}: ${e.message}`);
      await page.screenshot({ path: `/tmp/error_${table.name}.png`, fullPage: true });
    }
  }
  
  await browser.close();
  console.log('\n=== All datasets created! ===');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
