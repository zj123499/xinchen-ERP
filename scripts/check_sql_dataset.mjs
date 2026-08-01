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
  
  // 收集所有 API
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (!['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`\nAPI: ${path}`);
          console.log(body.substring(0, 800));
        }
      } catch(e) {}
    }
  });
  
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
  
  await page.evaluate(() => {
    document.querySelector('.dataset-name.ellipsis').textContent = '返佣记录';
  });
  
  // 选择数据源
  await page.locator('.table-list-top .ed-select__input').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.ed-select-dropdown__item, .ed-tree-node__content').filter({ hasText: '新辰未来' }).first().click({ force: true });
  await page.waitForTimeout(2000);
  
  // 看看表列表中的"自定义SQL"选项
  const customSql = page.locator('.list-item_primary').filter({ hasText: '自定义SQL' }).first();
  if (await customSql.isVisible().catch(() => false)) {
    console.log('Clicking 自定义SQL...');
    await customSql.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/custom_sql_click.png', fullPage: true });
    
    // 看看是否出现 SQL 编辑器
    const sqlEditors = await page.locator('textarea, [class*="editor"], [class*="sql"], [class*="code"]').all();
    console.log(`SQL editors: ${sqlEditors.length}`);
    for (const ed of sqlEditors) {
      const text = (await ed.textContent().catch(() => ''))?.trim()?.substring(0, 100);
      console.log(`  "${text}"`);
    }
  }
  
  // 检查是否有"添加全部字段"或"全选"之类的功能
  const allButtons = await page.locator('button, .ed-button, span[class*="btn"]').all();
  console.log('\nAll buttons on form:');
  for (const btn of allButtons) {
    const text = (await btn.textContent().catch(() => ''))?.trim();
    const visible = await btn.isVisible().catch(() => false);
    if (visible && text && text.length < 30) {
      console.log(`  "${text}"`);
    }
  }
  
  await page.screenshot({ path: '/tmp/full_form.png', fullPage: true });
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
