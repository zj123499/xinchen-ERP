import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

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
  const tokenData = await page.evaluate(() => localStorage.getItem('de_v2_user.token') || '');
  if (tokenData) writeFileSync('/tmp/dataease_token_raw.txt', tokenData);
}

function getJWT() {
  const raw = readFileSync('/tmp/dataease_token_raw.txt', 'utf8');
  const d = JSON.parse(raw);
  return JSON.parse(d.v);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 收集 API
  page.on('response', async (resp) => {
    const url = resp.url();
    const skip = ['font', 'typeface', 'sysParameter', 'license', 'msg-center', 'store', 'login', 'dekey', 'model', 'xpackModel', 'i18nOptions', 'defaultSettings', 'ui', 'shareBase', 'aiBase', 'sqlbot', 'defaultFont', 'interactiveTree'];
    if (url.includes('/de2api/') && resp.request().method() === 'POST' && !skip.some(s => url.includes(s))) {
      try {
        const body = await resp.text();
        if (body.length < 5000) {
          console.log(`API: ${url.substring(url.indexOf('/de2api/'))} -> ${body.substring(0, 300)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // Hover 到"数据准备"展开子菜单
  console.log('Hovering over "数据准备"...');
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1500);
  
  // 子菜单弹出后，点击"数据源"
  console.log('Looking for "数据源" in popup...');
  
  // 截图查看弹窗
  await page.screenshot({ path: '/tmp/hover_submenu.png', fullPage: true });
  
  // 点击弹窗中的"数据源"
  const dsPopupItem = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据源' }).first();
  if (await dsPopupItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found "数据源" in popup, clicking...');
    await dsPopupItem.click();
    await page.waitForTimeout(3000);
    console.log('URL after clicking:', page.url());
  } else {
    console.log('Popup not found, trying direct click...');
    // 尝试直接用坐标点击
    const popupItems = await page.locator('.ed-menu-item').all();
    for (const item of popupItems) {
      const text = await item.textContent().catch(() => '');
      console.log(`Menu item: "${text?.trim()}"`);
      if (text?.trim() === '数据源') {
        await item.click();
        await page.waitForTimeout(3000);
        break;
      }
    }
  }
  
  // 现在应该看到数据源列表
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('\nPage content:\n', pageText);
  
  // 点击"新辰未来"
  const xcEl = page.locator('span, div, td').filter({ hasText: '新辰未来' }).first();
  if (await xcEl.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found 新辰未来, clicking...');
    await xcEl.click();
    await page.waitForTimeout(3000);
    
    // 查看数据源详情页
    const detailText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('\nDatasource detail:\n', detailText);
    await page.screenshot({ path: '/tmp/xc_datasource.png', fullPage: true });
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
