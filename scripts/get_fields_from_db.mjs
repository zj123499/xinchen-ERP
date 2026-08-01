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
  const tokenData = await page.evaluate(() => localStorage.getItem('de_v2_user.token') || '');
  if (tokenData) writeFileSync('/tmp/dataease_token_raw.txt', tokenData);
}

function getJWT() {
  const { readFileSync } = require('fs');
  const raw = readFileSync('/tmp/dataease_token_raw.txt', 'utf8');
  const d = JSON.parse(raw);
  return JSON.parse(d.v);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 导航到数据源页面获取表信息
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  
  // 点击"数据源"
  const dsPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据源' }).first();
  await dsPopup.click();
  await page.waitForTimeout(3000);
  
  // 应该进入数据源页面，左侧有"新辰未来"
  console.log('URL:', page.url());
  
  // 点击"新辰未来"
  const xcNode = page.locator('span, div').filter({ hasText: /^新辰未来$/ }).first();
  if (await xcNode.isVisible({ timeout: 5000 }).catch(() => false)) {
    await xcNode.click();
    await page.waitForTimeout(3000);
  }
  
  await page.screenshot({ path: '/tmp/ds_detail.png', fullPage: true });
  
  // 获取页面上的表列表
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('Datasource page:\n', pageText);
  
  // 获取 JWT 并通过 API 获取表字段
  const jwt = await page.evaluate(() => {
    const t = localStorage.getItem('de_v2_user.token');
    if (!t) return '';
    return JSON.parse(JSON.parse(t).v);
  });
  
  // 获取所有关键表的字段
  const keyTables = [
    'rebates', 'commission_details', 'employees', 'partners', 'assets',
    'expenses', 'students', 'follow_up_records', 'contracts', 'payments',
    'enrollment', 'offers', 'applications', 'visas'
  ];
  
  // 通过 datasource/getTables API 可以看到表名
  // 但字段信息需要另一个 API
  
  // 尝试通过 preview 接口获取数据
  const allFields = {};
  
  for (const table of keyTables) {
    try {
      const resp = await page.evaluate(async ({ table, jwt, base }) => {
        const r = await fetch(base + '/de2api/datasource/previewData', {
          method: 'POST',
          headers: { 'X-DE-TOKEN': jwt, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasourceId: '1273399598202884096',
            tableName: table,
            page: 1,
            pageSize: 1
          })
        });
        return r.json();
      }, { table, jwt, base: BASE });
      
      console.log(`${table}:`, JSON.stringify(resp).substring(0, 200));
    } catch(e) {
      console.log(`${table}: error - ${e.message}`);
    }
  }
  
  writeFileSync('/tmp/fields_result.json', JSON.stringify(allFields, null, 2));
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
