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

async function navigateToDatasetList(page) {
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('.tree-header', { timeout: 8000 });
}

async function createDataset(page, tableInfo) {
  console.log(`\n--- ${tableInfo.label} (${tableInfo.name}) ---`);
  
  // 确保在数据集列表页面
  await navigateToDatasetList(page);
  
  // 点击新建数据集按钮
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 1. 设置名称 - 点击 dataset-name span
  const nameSpan = page.locator('.dataset-name.ellipsis').first();
  await nameSpan.dblclick();
  await page.waitForTimeout(500);
  
  // 双击后应该出现 input 框
  // 查找新出现的 input
  const editInput = page.locator('input').filter({ hasText: '未命名数据集' });
  if (await editInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await editInput.fill(tableInfo.label);
    await page.keyboard.press('Enter');
  } else {
    // 尝试通过 evaluate 修改
    await page.evaluate((name) => {
      const span = document.querySelector('.dataset-name.ellipsis');
      if (span) {
        span.textContent = name;
        // 触发 input 事件
        span.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, tableInfo.label);
  }
  await page.waitForTimeout(500);
  console.log(`  Name: ${tableInfo.label}`);
  
  // 2. 选择数据源 - 点击"选择数据源"区域
  // 查找 .select-ds 并点击
  const selectDs = page.locator('.select-ds').first();
  
  // 先检查当前是否已选择数据源
  const currentDsText = await selectDs.textContent().catch(() => '');
  console.log(`  Current DS text: "${currentDsText}"`);
  
  if (currentDsText.includes('选择数据源') || currentDsText.includes('请选择')) {
    // 点击选择数据源
    await selectDs.click();
    await page.waitForTimeout(1000);
    
    // 截图看下拉菜单
    await page.screenshot({ path: '/tmp/ds_dropdown.png', fullPage: true });
    
    // 查找下拉列表
    const dropdownItems = await page.locator('.ed-select-dropdown__item, .ed-select-dropdown li, [class*="option"]').all();
    console.log(`  Dropdown items: ${dropdownItems.length}`);
    for (const item of dropdownItems) {
      const text = (await item.textContent().catch(() => ''))?.trim();
      const visible = await item.isVisible().catch(() => false);
      if (visible) console.log(`    "${text}"`);
      if (visible && text?.includes('新辰未来')) {
        await item.click();
        await page.waitForTimeout(2000);
        console.log('  Selected 新辰未来!');
        break;
      }
    }
  }
  
  // 3. 搜索并添加数据表
  // 选择数据源后，表列表应该自动加载
  await page.waitForTimeout(2000);
  
  // 先截图看状态
  await page.screenshot({ path: `/tmp/before_table_${tableInfo.name}.png`, fullPage: true });
  
  // 查找表搜索框
  const tableSearch = page.locator('input[placeholder*="表名称"]').first();
  const searchVisible = await tableSearch.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`  Table search visible: ${searchVisible}`);
  
  if (searchVisible) {
    await tableSearch.click();
    await tableSearch.fill('');
    await page.waitForTimeout(500);
    await tableSearch.fill(tableInfo.name);
    await page.waitForTimeout(2000);
    
    // 等待搜索结果
    // 查找搜索结果中的表项
    const resultItems = await page.locator('[class*="table-list"] span, [class*="table-list"] div, [class*="search"] span').all();
    console.log(`  Search result items: ${resultItems.length}`);
    
    for (const item of resultItems) {
      const text = (await item.textContent().catch(() => ''))?.trim();
      if (text === tableInfo.name) {
        console.log(`  Found table item: "${text}", double-clicking...`);
        await item.dblclick();
        await page.waitForTimeout(2000);
        break;
      }
    }
  }
  
  // 4. 查看中间区域是否有字段
  const centerArea = await page.evaluate(() => {
    const center = document.querySelector('[class*="center"], [class*="main"], [class*="field"]');
    if (!center) return 'No center area';
    return center.innerText?.substring(0, 300);
  });
  console.log(`  Center area: ${centerArea?.substring(0, 100)}`);
  
  await page.screenshot({ path: `/tmp/ds_${tableInfo.name}.png`, fullPage: true });
  
  // 5. 保存
  const saveBtn = page.locator('button').filter({ hasText: /^保存$/ }).first();
  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
    
    // 检查是否有错误提示
    const messages = await page.locator('[class*="message"], .ed-message').all();
    for (const msg of messages) {
      const text = (await msg.textContent().catch(() => ''))?.trim();
      if (text) console.log(`  Message: ${text}`);
    }
    
    // 检查是否保存成功（页面变化）
    const currentUrl = page.url();
    console.log(`  After save URL: ${currentUrl}`);
    
    if (currentUrl.includes('dataset-form')) {
      console.log('  Still on form - might need to manually add table');
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
  
  for (const table of TABLES) {
    try {
      await createDataset(page, table);
    } catch(e) {
      console.error(`  ERROR: ${e.message}`);
      await page.screenshot({ path: `/tmp/error_${table.name}.png`, fullPage: true });
      // 尝试恢复到数据集列表页
      try {
        await navigateToDatasetList(page);
      } catch(e2) {}
    }
  }
  
  await browser.close();
  console.log('\n=== Done! ===');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
