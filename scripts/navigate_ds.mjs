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

function getJWT() {
  const raw = readFileSync('/tmp/dataease_token_raw.txt', 'utf8');
  const d = JSON.parse(raw);
  return JSON.parse(d.v);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 收集 API
  const apiLog = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (body.length < 5000 && !url.includes('font') && !url.includes('typeface') && !url.includes('sysParameter') && !url.includes('license') && !url.includes('msg-center') && !url.includes('store') && !url.includes('login')) {
          apiLog.push({ path, body: body.substring(0, 3000) });
          console.log(`\n=== API: ${path} ===`);
          console.log(body.substring(0, 500));
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  
  // 在工作台页面上，找到"数据准备"入口
  console.log('\n=== On workbench, finding "数据准备" ===');
  await page.waitForTimeout(2000);
  
  // 点击左侧导航中的"数据准备"
  const dataPrepLink = page.locator('div, span, li, a').filter({ hasText: /^数据准备$/ }).first();
  if (await dataPrepLink.isVisible().catch(() => false)) {
    console.log('Found 数据准备, clicking...');
    await dataPrepLink.click();
    await page.waitForTimeout(3000);
    console.log('URL after click:', page.url());
  } else {
    // 尝试用 CSS class 定位侧边栏
    console.log('Looking for sidebar navigation...');
    const sidebarItems = await page.locator('.ed-menu-item, .menu-item, nav li, .sidebar-item, [class*="side"] [class*="item"]').all();
    for (const item of sidebarItems) {
      const text = (await item.textContent().catch(() => ''))?.trim();
      if (text && text.length < 20) {
        console.log(`Sidebar: "${text}"`);
      }
    }
  }
  
  // 尝试点击左侧的"数据源"子菜单
  const dsMenuLink = page.locator('div, span, li, a').filter({ hasText: /数据源/ }).first();
  if (await dsMenuLink.isVisible().catch(() => false)) {
    console.log('Found 数据源 link, clicking...');
    await dsMenuLink.click();
    await page.waitForTimeout(3000);
    console.log('URL after data source click:', page.url());
  }
  
  await page.screenshot({ path: '/tmp/workbench_nav.png', fullPage: true });
  
  // 尝试找到"新辰未来"的链接
  const xcLink = page.locator('span, div, td, a').filter({ hasText: '新辰未来' }).first();
  if (await xcLink.isVisible().catch(() => false)) {
    console.log('Found 新辰未来 on page, clicking...');
    await xcLink.click();
    await page.waitForTimeout(3000);
    console.log('URL after clicking 新辰未来:', page.url());
    await page.screenshot({ path: '/tmp/xc_detail.png', fullPage: true });
  }
  
  // 查看页面上的所有文本
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
  console.log('\nPage content:\n', pageText);
  
  writeFileSync('/tmp/api_log_final.json', JSON.stringify(apiLog, null, 2));
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
