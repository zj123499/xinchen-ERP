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
  
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (!['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`\nAPI: ${path}`);
          console.log(body.substring(0, 500));
        }
      } catch(e) {}
    }
  });
  
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
  
  // 双击"自定义SQL"
  const customSql = page.locator('.list-item_primary').filter({ hasText: '自定义SQL' }).first();
  console.log('Double-clicking 自定义SQL...');
  await customSql.dblclick();
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: '/tmp/after_dblclick_sql.png', fullPage: true });
  
  // 检查是否有新的弹窗/对话框
  const newDialogs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[class*="dialog"], [class*="drawer"], [class*="modal"], [class*="editor"]')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 100 && rect.height > 100 && el.offsetParent !== null;
    }).map(el => ({
      class: el.className?.substring?.(0, 80),
      text: el.textContent?.trim()?.substring(0, 200)
    }));
  });
  console.log('New dialogs:', JSON.stringify(newDialogs, null, 2));
  
  // 查找 SQL 输入框
  const sqlInputs = await page.locator('textarea:visible, [contenteditable="true"]:visible, .CodeMirror').all();
  console.log(`SQL inputs: ${sqlInputs.length}`);
  for (const inp of sqlInputs) {
    const text = (await inp.textContent().catch(() => ''))?.substring(0, 100);
    const placeholder = await inp.getAttribute('placeholder').catch(() => '');
    console.log(`  "${text}" placeholder="${placeholder}"`);
  }
  
  // 如果双击自定义SQL没反应，试试拖拽到中间
  // 也许 DataEase 的逻辑是：双击表=添加，双击自定义SQL=打开SQL编辑器
  const centerText = await page.evaluate(() => {
    const preview = document.querySelector('.table-preview, [class*="field-data"]');
    return preview?.textContent?.trim()?.substring(0, 200);
  });
  console.log('Center:', centerText);
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
