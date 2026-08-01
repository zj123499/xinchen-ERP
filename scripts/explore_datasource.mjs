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
    console.log('Logging in...');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(USER);
    await inputs[1].fill(PASS);
    await page.locator('.ed-button.submit, button:has-text("Login")').first().click();
    await page.waitForTimeout(3000);
  }
  
  const tokenData = await page.evaluate(() => localStorage.getItem('de_v2_user.token') || '');
  if (tokenData) writeFileSync('/tmp/dataease_token_raw.txt', tokenData);
  return tokenData;
}

function getJWT() {
  try {
    const raw = readFileSync('/tmp/dataease_token_raw.txt', 'utf8');
    const d = JSON.parse(raw);
    return JSON.parse(d.v);
  } catch(e) { return ''; }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  const apiLog = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (body.length < 5000) {
          apiLog.push({ path, status: resp.status(), body: body.substring(0, 2000) });
          console.log(`API: ${path} -> ${body.substring(0, 150)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  const jwt = getJWT();
  console.log('JWT:', jwt?.substring(0, 30) + '...');
  
  // 导航到数据源管理 - 进入"新辰未来"数据源
  console.log('\n=== Navigate to Datasource ===');
  await page.goto(`${BASE}/#/datasource`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // 看看页面上的内容
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Datasource page text:', pageText);
  
  // 点击"新辰未来"数据源
  const xcLink = page.locator('span, div, a').filter({ hasText: '新辰未来' }).first();
  if (await xcLink.isVisible().catch(() => false)) {
    console.log('Found 新辰未来, clicking...');
    await xcLink.click();
    await page.waitForTimeout(3000);
    console.log('After click, URL:', page.url());
    
    const pageText2 = await page.evaluate(() => document.body.innerText.substring(0, 800));
    console.log('Datasource detail text:', pageText2);
  } else {
    console.log('新辰未来 not found on datasource page');
    // 尝试通过 API 获取数据源详情
    const resp = await fetch(`${BASE}/de2api/datasource/get`, {
      method: 'POST',
      headers: { 'X-DE-TOKEN': jwt, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: DS_ID })
    });
    const data = await resp.json();
    console.log('Datasource detail API:', JSON.stringify(data).substring(0, 500));
  }
  
  await page.screenshot({ path: '/tmp/datasource_page.png', fullPage: true });
  console.log('Screenshot saved');
  
  // 尝试用 API 获取表字段 - 通过 SQL 执行
  console.log('\n=== Try SQL execution ===');
  // 尝试多种 SQL 执行路径
  const sqlPaths = [
    '/de2api/datasource/execSql',
    '/de2api/datasource/executeSql',
    '/de2api/dataset/table/previewData',
    '/de2api/tableData/page',
  ];
  
  for (const p of sqlPaths) {
    try {
      const resp = await fetch(`${BASE}${p}`, {
        method: 'POST',
        headers: { 'X-DE-TOKEN': jwt, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasourceId: DS_ID,
          sql: "SELECT * FROM rebates LIMIT 1",
          tableName: "rebates"
        })
      });
      const data = await resp.json();
      console.log(`${p}: status=${resp.status}, data=${JSON.stringify(data).substring(0, 200)}`);
    } catch(e) {
      console.log(`${p}: Error - ${e.message}`);
    }
  }
  
  writeFileSync('/tmp/api_log2.json', JSON.stringify(apiLog, null, 2));
  console.log(`\nAPI log saved: ${apiLog.length} entries`);
  
  await browser.close();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
