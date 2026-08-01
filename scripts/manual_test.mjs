import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';

async function main() {
  // 非 headless 模式
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 监听所有 API
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (!['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`\nAPI: ${path}`);
          console.log(body.substring(0, 600));
        }
      } catch(e) {}
    }
  });
  
  // 登录
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  if (page.url().includes('login')) {
    const inputs = await page.locator('input').all();
    await inputs[0].fill(USER);
    await inputs[1].fill(PASS);
    await page.locator('.ed-button.submit, button:has-text("Login")').first().click();
    await page.waitForTimeout(3000);
  }
  
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
  
  console.log('\nBrowser is open. Please manually:');
  console.log('1. Set dataset name');
  console.log('2. Select 新辰未来 data source');
  console.log('3. Drag a table to the center area');
  console.log('4. Click Save');
  console.log('\nCheck the API calls in the console.');
  console.log('Press Ctrl+C when done or browser will stay open for 60s.');
  
  // 等待 60 秒让用户操作
  await page.waitForTimeout(60000);
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
