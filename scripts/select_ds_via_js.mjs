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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 导航到数据集
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('.tree-header', { timeout: 8000 });
  
  // 点击新建数据集
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 设置名称
  await page.evaluate((name) => {
    const span = document.querySelector('.dataset-name.ellipsis');
    if (span) span.textContent = name;
  }, '返佣记录');
  
  // 通过点击 select-ds 中的 ed-select__input 来打开下拉框
  // 先找到这个 input
  const dsSelectInput = page.locator('.table-list-top .ed-select__input, .table-list input.ed-select__input').first();
  console.log('DS select input visible:', await dsSelectInput.isVisible().catch(() => false));
  
  if (await dsSelectInput.isVisible().catch(() => false)) {
    await dsSelectInput.click();
    await page.waitForTimeout(1000);
  } else {
    // 点击整个 select-ds 区域
    await page.locator('.select-ds').first().click();
    await page.waitForTimeout(1000);
  }
  
  await page.screenshot({ path: '/tmp/ds_dropdown_open.png', fullPage: true });
  
  // 查找下拉选项 - 它们可能在 body 级别的 popper 中
  const popperItems = await page.locator('.ed-select-dropdown__item, .ed-tree-node__content').all();
  console.log(`Popper items: ${popperItems.length}`);
  for (const item of popperItems) {
    const text = (await item.textContent().catch(() => ''))?.trim();
    const isVisible = await item.isVisible().catch(() => false);
    const box = await item.boundingBox().catch(() => null);
    console.log(`  "${text}" visible=${isVisible} box=${box ? `${Math.round(box.x)},${Math.round(box.y)}` : 'none'}`);
    
    if (text === '新辰未来' && box) {
      console.log('  -> Clicking!');
      await item.click({ force: true });
      await page.waitForTimeout(2000);
      break;
    }
  }
  
  // 检查数据源是否已选择
  const dsText = await page.locator('.select-ds').first().textContent().catch(() => '');
  console.log(`DS text after: "${dsText}"`);
  
  await page.screenshot({ path: '/tmp/after_ds_selected.png', fullPage: true });
  
  // 如果选择成功，搜索表
  const tableSearch = page.locator('input[placeholder*="表名称"]').first();
  if (await tableSearch.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tableSearch.fill('rebates');
    await page.waitForTimeout(2000);
    
    // 查找搜索结果
    const tableItems = await page.evaluate(() => {
      const items = document.querySelectorAll('[class*="table-list"] [class*="item"], [class*="search"] [class*="item"]');
      return Array.from(items).map(i => i.textContent?.trim()?.substring(0, 30));
    });
    console.log('Table search results:', tableItems);
    
    await page.screenshot({ path: '/tmp/table_search.png', fullPage: true });
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
