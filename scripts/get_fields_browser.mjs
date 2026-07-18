import { chromium } from 'playwright';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const TOKEN_FILE = '/tmp/dataease_token.txt';

// 读取已有 token
import { readFileSync, writeFileSync } from 'fs';
let token = '';
try { token = readFileSync(TOKEN_FILE, 'utf8').trim(); } catch(e) {}

async function login(page) {
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // 检查是否已登录
  const currentUrl = page.url();
  if (currentUrl.includes('login')) {
    await page.fill('input[placeholder*="用户名"], input[type="text"]', USER);
    await page.fill('input[placeholder*="密码"], input[type="password"]', PASS);
    await page.click('button:has-text("登录"), button[type="submit"]');
    await page.waitForTimeout(3000);
  }
  
  // 获取新 token
  const newToken = await page.evaluate(() => {
    return localStorage.getItem('de_v2_user.token') || localStorage.getItem('user.token') || '';
  });
  if (newToken) {
    writeFileSync(TOKEN_FILE, newToken.trim());
    return newToken.trim();
  }
  return token;
}

async function getTableFieldsAPI(token, tableName) {
  // 尝试直接 SQL 查询
  const response = await fetch(BASE + '/de2api/dataset/table/getFields', {
    method: 'POST',
    headers: {
      'X-DE-TOKEN': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      datasourceId: '1273399598202884096',
      tableName: tableName
    })
  });
  return response.json();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  token = await login(page);
  console.log('Token:', token.substring(0, 50) + '...');
  
  const tables = [
    'rebates', 'commission_details', 'employees', 'partners', 'assets',
    'expenses', 'students', 'follow_up_records', 'contracts', 'payments',
    'enrollment', 'offers', 'applications', 'visas'
  ];
  
  const fieldsInfo = {};
  
  for (const table of tables) {
    console.log(`\n--- Getting fields for: ${table} ---`);
    try {
      const result = await getTableFieldsAPI(token, table);
      console.log(JSON.stringify(result, null, 2).substring(0, 1000));
      if (result.data && result.data.length > 0) {
        fieldsInfo[table] = result.data.map(f => ({
          name: f.name || f.fieldName || f.columnName,
          type: f.type || f.dataType || f.fieldType,
          comment: f.comment || ''
        }));
      }
    } catch(e) {
      console.log(`Error for ${table}:`, e.message);
    }
  }
  
  // 也尝试用页面方式获取
  console.log('\n=== Trying browser UI approach ===');
  await page.goto(BASE + '/#/dataset', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // 点击新建数据集
  const addBtn = page.locator('button, a, span').filter({ hasText: /新建|创建数据集|添加/ }).first();
  if (await addBtn.isVisible()) {
    console.log('Found add button');
  }
  
  // 截图查看当前页面
  await page.screenshot({ path: '/tmp/de_dataset_page.png', fullPage: false });
  console.log('Screenshot saved to /tmp/de_dataset_page.png');
  
  // 输出完整结果
  console.log('\n=== Final Fields Summary ===');
  console.log(JSON.stringify(fieldsInfo, null, 2));
  
  writeFileSync('/tmp/table_fields.json', JSON.stringify(fieldsInfo, null, 2));
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
