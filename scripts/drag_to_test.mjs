import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';

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
  
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('.tree-header', { timeout: 8000 });
  
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  await page.evaluate(() => {
    document.querySelector('.dataset-name.ellipsis').textContent = '返佣记录';
  });
  
  // 选择数据源
  await page.locator('.table-list-top .ed-select__input').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.ed-select-dropdown__item, .ed-tree-node__content').filter({ hasText: '新辰未来' }).first().click({ force: true });
  await page.waitForTimeout(2000);
  
  // 不搜索，直接在列表中找 rebates
  // 先看完整的表列表
  const tableNames = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.list-item_primary')).map(el => el.textContent?.trim());
  });
  console.log('Tables in list:', tableNames.slice(0, 20));
  
  // 搜索 rebates
  await page.locator('input[placeholder*="表名称"]').first().fill('rebates');
  await page.waitForTimeout(2000);
  
  // 使用 Playwright 的 dragTo
  const source = page.locator('.list-item_primary').first();
  const target = page.locator('.table-preview, .field-data, [class*="preview-field"]').first();
  
  console.log('Attempting dragTo...');
  try {
    await source.dragTo(target, { timeout: 5000 });
    console.log('dragTo completed!');
  } catch(e) {
    console.log('dragTo failed:', e.message);
    
    // 手动拖拽
    const srcBox = await source.boundingBox();
    const tgtBox = await target.boundingBox();
    console.log(`Source: (${srcBox.x}, ${srcBox.y}) ${srcBox.width}x${srcBox.height}`);
    console.log(`Target: (${tgtBox.x}, ${tgtBox.y}) ${tgtBox.width}x${tgtBox.height}`);
    
    await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300);
    
    // 移动到目标位置
    await page.mouse.move(tgtBox.x + tgtBox.width / 2, tgtBox.y + tgtBox.height / 2, { steps: 20 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    console.log('Manual drag completed!');
  }
  
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/after_dragto.png', fullPage: true });
  
  // 检查中间区域
  const fieldStatus = await page.evaluate(() => {
    const preview = document.querySelector('.table-preview');
    return preview?.textContent?.trim()?.substring(0, 200);
  });
  console.log('Preview area:', fieldStatus);
  
  // 保存
  await page.locator('button').filter({ hasText: /^保存$/ }).first().click();
  await page.waitForTimeout(3000);
  
  const msgs = await page.locator('[class*="message"]').all();
  for (const m of msgs) {
    const t = (await m.textContent().catch(() => ''))?.trim();
    if (t) console.log('Msg:', t);
  }
  console.log('URL:', page.url());
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
