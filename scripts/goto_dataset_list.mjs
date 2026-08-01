import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

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
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (body.length < 8000 && !['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree'].some(s => url.includes(s))) {
          console.log(`\nAPI: ${path} -> ${body.substring(0, 500)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  
  // 导航到数据集页面 - 通过 hover 菜单
  console.log('\n=== Navigate to dataset via menu ===');
  await page.goto(BASE + '/#/workbranch/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Hover "数据准备" -> 点击"数据集"
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1500);
  
  const datasetPopupItem = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  if (await datasetPopupItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found 数据集 in popup, clicking...');
    await datasetPopupItem.click();
    await page.waitForTimeout(5000);
    console.log('URL:', page.url());
    
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('Page content:\n', pageText);
    
    await page.screenshot({ path: '/tmp/dataset_list.png', fullPage: true });
    
    // 查看数据集列表 - 尝试找到新建按钮
    const allButtons = await page.locator('.ed-button, button, [role="button"]').all();
    console.log('\nButtons:');
    for (const btn of allButtons) {
      const text = (await btn.textContent().catch(() => ''))?.trim();
      if (text && text.length < 30) console.log(`  "${text}"`);
    }
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
