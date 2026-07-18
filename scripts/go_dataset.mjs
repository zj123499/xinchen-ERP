import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';

async function login(page) {
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  if (page.url().includes('login')) {
    console.log('Logging in...');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(USER);
    await inputs[1].fill(PASS);
    await page.locator('.ed-button.submit, button:has-text("Login")').first().click();
    await page.waitForTimeout(3000);
  }
  
  const tokenData = await page.evaluate(() => localStorage.getItem('de_v2_user.token') || '');
  if (tokenData) writeFileSync('/tmp/dataease_token_raw.txt', tokenData);
}

async function clickByText(page, text) {
  const el = page.locator(`text="${text}"`).first();
  if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log(`Clicking: "${text}"`);
    await el.click();
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 收集业务 API
  const bizAPIs = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    const skip = ['font', 'typeface', 'sysParameter', 'license', 'msg-center', 'store', 'login', 'dekey', 'model', 'xpackModel', 'interactiveTree', 'i18nOptions', 'defaultSettings', 'ui', 'shareBase', 'aiBase', 'sqlbot', 'defaultFont'];
    if (url.includes('/de2api/') && resp.request().method() === 'POST' && !skip.some(s => url.includes(s))) {
      try {
        const body = await resp.text();
        if (body.length < 5000) {
          bizAPIs.push({ path: url.substring(url.indexOf('/de2api/')), body: body.substring(0, 2000) });
          console.log(`API: ${url.substring(url.indexOf('/de2api/'))} -> ${body.substring(0, 200)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 在工作台点击"数据准备"展开子菜单
  console.log('\n=== Navigating to dataset management ===');
  
  // 方法1: 直接导航到数据集路由
  await page.goto(BASE + '/#/dataset-management', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('URL after dataset-management:', page.url());
  
  // 检查是否成功进入
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 800));
  if (pageText.includes('数据集') && (pageText.includes('新建') || pageText.includes('创建'))) {
    console.log('Successfully on dataset page!');
  } else {
    console.log('Not on dataset page, trying alternatives...');
    
    // 方法2: 点击"数据集"链接（在快速创建区域）
    await clickByText(page, '数据集');
    console.log('URL after clicking 数据集:', page.url());
    
    // 方法3: 尝试其他路由
    const routes = ['/#/dataset-group', '/#/data-preparation', '/#/dataset/list'];
    for (const route of routes) {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      const text = await page.evaluate(() => document.body.innerText.substring(0, 300));
      console.log(`Route ${route}: URL=${page.url()}, text=${text}`);
    }
  }
  
  await page.screenshot({ path: '/tmp/current_page.png', fullPage: true });
  
  // 查看当前页面所有可交互元素
  const buttons = await page.locator('.ed-button, button, .ed-link, a').all();
  console.log('\nClickable elements:');
  for (const btn of buttons) {
    try {
      const text = (await btn.textContent())?.trim();
      const visible = await btn.isVisible().catch(() => false);
      if (visible && text && text.length < 30) {
        console.log(`  "${text}"`);
      }
    } catch(e) {}
  }
  
  writeFileSync('/tmp/biz_apis.json', JSON.stringify(bizAPIs, null, 2));
  console.log(`\nBiz APIs: ${bizAPIs.length}`);
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
