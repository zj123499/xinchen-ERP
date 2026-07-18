import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const DS_ID = '1273399598202884096';

// 要创建数据集的核心业务表
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
  const tokenData = await page.evaluate(() => localStorage.getItem('de_v2_user.token') || '');
  if (tokenData) writeFileSync('/tmp/dataease_token_raw.txt', tokenData);
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

async function clickNewDataset(page) {
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  // 等待数据集表单出现
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
}

async function createSingleDataset(page, tableInfo) {
  console.log(`\n=== Creating dataset: ${tableInfo.label} (${tableInfo.name}) ===`);
  
  // 点击新建数据集按钮
  await clickNewDataset(page);
  
  // 1. 设置数据集名称
  // 找到名称输入框 - 在 de-dataset-form 中查找
  const nameInput = page.locator('.de-dataset-form input').first();
  await nameInput.click({ clickCount: 3 }); // 全选
  await nameInput.fill(tableInfo.label);
  await page.waitForTimeout(500);
  console.log(`  Set name: ${tableInfo.label}`);
  
  // 2. 选择数据源 - 点击数据源选择区域
  // 查找"请选择数据源"或数据源选择器
  const dsSelector = page.locator('.de-dataset-form').locator('div, span').filter({ hasText: /请选择数据源|选择数据源/ }).first();
  
  // 或者查找包含"新辰未来"的选项
  // 先看看有没有直接的选择器
  const dsArea = page.locator('.de-dataset-form');
  
  // 点击数据源下拉框 - 查找 ed-select 组件
  const selectEls = dsArea.locator('.ed-select');
  const selectCount = await selectEls.count();
  console.log(`  Found ${selectCount} select elements`);
  
  if (selectCount > 0) {
    // 点击第一个下拉框（数据源选择）
    await selectEls.first().click();
    await page.waitForTimeout(1000);
    
    // 在下拉列表中选择"新辰未来"
    const xcOption = page.locator('.ed-select-dropdown__item, .ed-option').filter({ hasText: '新辰未来' }).first();
    if (await xcOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await xcOption.click();
      await page.waitForTimeout(1500);
      console.log('  Selected 新辰未来 data source');
    }
  }
  
  // 3. 选择数据表 - 搜索表名
  const tableSearchInput = page.locator('input[placeholder*="表名称"]').first();
  if (await tableSearchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tableSearchInput.fill(tableInfo.name);
    await page.waitForTimeout(1500);
    console.log(`  Searched table: ${tableInfo.name}`);
    
    // 等待搜索结果出现，然后点击表名
    const tableItem = page.locator('span, div').filter({ hasText: tableInfo.name }).first();
    // 尝试拖拽或点击表
    // DataEase 中通常需要拖拽表到中间区域
  }
  
  // 截图查看当前状态
  await page.screenshot({ path: `/tmp/ds_${tableInfo.name}.png`, fullPage: true });
  
  // 4. 查看左侧表列表中是否有我们的表
  const leftTables = await page.evaluate(() => {
    const leftPanel = document.querySelector('[class*="left"], [class*="source"], [class*="table-list"]');
    if (!leftPanel) return 'No left panel';
    return leftPanel.innerText?.substring(0, 500);
  });
  console.log('  Left panel tables:', leftTables);
  
  // 5. 尝试保存
  const saveBtn = page.locator('button, .ed-button').filter({ hasText: /^保存$/ }).first();
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('  Clicking save...');
    await saveBtn.click();
    await page.waitForTimeout(3000);
    console.log('  Dataset saved!');
  }
  
  // 查看保存后的状态
  const afterSaveText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('  After save:', afterSaveText.substring(0, 200));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  await navigateToDataset(page);
  
  // 先创建第一个数据集测试流程
  await createSingleDataset(page, TABLES[0]);
  
  // 成功后继续创建其他数据集
  // for (const table of TABLES.slice(1)) {
  //   await createSingleDataset(page, table);
  // }
  
  await browser.close();
  console.log('\n=== Done! ===');
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
