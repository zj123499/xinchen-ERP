import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const DS_ID = '1273399598202884096';

function getJWT() {
  try {
    const raw = readFileSync('/tmp/dataease_token_raw.txt', 'utf8');
    const d = JSON.parse(raw);
    return JSON.parse(d.v);
  } catch(e) { return ''; }
}

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
  
  const tokenData = await page.evaluate(() => {
    return localStorage.getItem('de_v2_user.token') || '';
  });
  if (tokenData) writeFileSync('/tmp/dataease_token_raw.txt', tokenData);
  return tokenData;
}

async function apiCall(jwt, path, body) {
  const resp = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'X-DE-TOKEN': jwt, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return resp.json();
}

// 核心业务表
const TABLES = [
  { name: 'rebates', label: '返佣记录' },
  { name: 'commission_details', label: '佣金明细' },
  { name: 'employees', label: '员工信息' },
  { name: 'partners', label: '合作伙伴' },
  { name: 'assets', label: '资产管理' },
  { name: 'expenses', label: '费用支出' },
  { name: 'students', label: '学生信息' },
  { name: 'follow_up_records', label: '跟进记录' },
  { name: 'contracts', label: '合同管理' },
  { name: 'payments', label: '付款记录' },
  { name: 'enrollment', label: '报名注册' },
  { name: 'offers', label: '录取通知' },
  { name: 'applications', label: '申请记录' },
  { name: 'visas', label: '签证管理' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // 收集 API 日志
  const apiLog = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (body.length < 3000 && !url.includes('.js') && !url.includes('.css')) {
          apiLog.push({ path, status: resp.status(), body: body.substring(0, 1000) });
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  const jwt = getJWT();
  console.log('JWT:', jwt?.substring(0, 40) + '...');
  
  // Step 1: 进入数据集管理页面
  console.log('\n=== Dataset Management Page ===');
  await page.goto(BASE + '/#/dataset', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // 查看页面 HTML 获取可用操作
  const pageHtml = await page.content();
  writeFileSync('/tmp/dataset_page.html', pageHtml);
  
  // 查找所有 ed-button
  const edButtons = await page.locator('.ed-button, button, [role="button"]').all();
  console.log('Buttons on dataset page:');
  for (const btn of edButtons) {
    try {
      const text = (await btn.textContent())?.trim();
      const cls = await btn.getAttribute('class');
      if (text && text.length < 40) {
        console.log(`  "${text}" [${cls?.substring(0, 50)}]`);
      }
    } catch(e) {}
  }
  
  await page.screenshot({ path: '/tmp/dataset_page.png', fullPage: true });
  console.log('Screenshot saved');
  
  // Step 2: 尝试点击"新建数据集"按钮
  console.log('\n=== Click create dataset ===');
  // 尝试各种选择器
  const createSelectors = [
    '.ed-button:has-text("新建数据集")',
    'button:has-text("新建数据集")',
    'span:has-text("新建数据集")',
    'div:has-text("新建数据集")',
    '.ed-button:has-text("创建")',
    '.ed-button:has-text("新建")',
    '[class*="create"]',
    '[class*="add"]',
  ];
  
  let clicked = false;
  for (const sel of createSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      console.log(`Found: ${sel}, clicking...`);
      await el.click();
      await page.waitForTimeout(3000);
      clicked = true;
      break;
    }
  }
  
  if (!clicked) {
    console.log('No create button found, trying direct navigation...');
    // 尝试直接导航到数据集创建页面
    await page.goto(`${BASE}/#/dataset-form`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  }
  
  await page.screenshot({ path: '/tmp/dataset_form.png', fullPage: true });
  console.log('After click/navigate, URL:', page.url());
  
  // Step 3: 查看创建页面上的元素
  const formButtons = await page.locator('.ed-button, button, select, .ed-select, input').all();
  console.log('\nForm elements:');
  for (const el of formButtons) {
    try {
      const text = (await el.textContent())?.trim();
      const tag = await el.evaluate(e => e.tagName);
      const cls = await el.getAttribute('class');
      const placeholder = await el.getAttribute('placeholder');
      if ((text && text.length < 50) || placeholder) {
        console.log(`  [${tag}] "${text || ''}" placeholder="${placeholder || ''}" class="${cls?.substring(0, 60) || ''}"`);
      }
    } catch(e) {}
  }
  
  writeFileSync('/tmp/api_log.json', JSON.stringify(apiLog, null, 2));
  console.log(`\nTotal API calls captured: ${apiLog.length}`);
  console.log('API paths:', apiLog.map(a => a.path).join(', '));
  
  await browser.close();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
