import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const DS_ID = '1273399598202884096';

async function loginAndGetJWT(page) {
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  if (page.url().includes('login')) {
    console.log('Logging in...');
    const inputs = await page.locator('input').all();
    await inputs[0].fill(USER);
    await inputs[1].fill(PASS);
    const loginBtn = page.locator('button').filter({ hasText: /登/ }).first();
    await loginBtn.click();
    await page.waitForTimeout(3000);
  }
  
  const tokenData = await page.evaluate(() => {
    const t = localStorage.getItem('de_v2_user.token');
    if (!t) return '';
    const d = JSON.parse(t);
    return JSON.parse(d.v);
  });
  
  writeFileSync('/tmp/de_jwt.txt', tokenData);
  return tokenData;
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

async function apiCall(jwt, path, body) {
  const response = await fetch(BASE + path, {
    method: 'POST',
    headers: {
      'X-DE-TOKEN': jwt,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return response.json();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // 监听网络请求找出 API
  const apiLog = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (body.length < 3000) {
          apiLog.push({ path, method: resp.request().method(), status: resp.status(), body: body.substring(0, 500) });
        }
      } catch(e) {}
    }
  });
  
  const jwt = await loginAndGetJWT(page);
  console.log('JWT obtained:', jwt.substring(0, 40) + '...');
  
  // Step 1: 进入数据集页面，找到创建数据集的正确流程
  console.log('\n=== Step 1: Explore dataset creation ===');
  await page.goto(BASE + '/#/dataset', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // 查找所有可点击元素
  const allElements = await page.locator('button, a, span, div, li').all();
  const clickable = [];
  for (const el of allElements) {
    try {
      const text = (await el.textContent())?.trim();
      const visible = await el.isVisible().catch(() => false);
      if (visible && text && text.length > 0 && text.length < 30 && text !== '预览' && text !== '应用') {
        clickable.push(text);
      }
    } catch(e) {}
  }
  console.log('Visible elements:', [...new Set(clickable)].join(', '));
  
  // 查找左侧菜单中的"数据集"入口
  // 尝试通过左侧导航栏进入
  const menuItems = page.locator('.el-menu-item, .menu-item, nav a, .sidebar-item, [class*="menu"]');
  const menuCount = await menuItems.count();
  console.log(`Menu items: ${menuCount}`);
  
  for (let i = 0; i < menuCount; i++) {
    const text = await menuItems.nth(i).textContent().catch(() => '');
    if (text.includes('数据')) console.log(`Menu [${i}]: "${text.trim()}"`);
  }
  
  // 截图
  await page.screenshot({ path: '/tmp/de_dataset_page.png', fullPage: true });
  console.log('Screenshot saved');
  
  // Step 2: 尝试通过 API 获取字段信息
  console.log('\n=== Step 2: Get table fields via API ===');
  
  // 尝试各种可能的 API 路径
  const apiPaths = [
    '/de2api/dataset/table/getFields',
    '/de2api/datasource/getField',
    '/de2api/dataset/table/field/list',
    '/de2api/table/getFields',
  ];
  
  for (const apiPath of apiPaths) {
    try {
      const result = await apiCall(jwt, apiPath, { 
        datasourceId: DS_ID, 
        tableName: 'rebates' 
      });
      console.log(`${apiPath}:`, JSON.stringify(result).substring(0, 200));
    } catch(e) {
      console.log(`${apiPath}: Error -`, e.message);
    }
  }
  
  // Step 3: 通过浏览器页面获取字段信息
  console.log('\n=== Step 3: Get fields via browser ===');
  
  // 导航到数据集创建页面，选择一个表来查看字段
  // 直接构造创建数据集的 URL
  await page.goto(`${BASE}/#/dataset-form?datasourceId=${DS_ID}&tableName=rebates`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: '/tmp/de_dataset_form.png', fullPage: false });
  
  console.log('Current URL:', page.url());
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Page text:', pageText);
  
  // 保存捕获的 API 日志
  writeFileSync('/tmp/api_log.json', JSON.stringify(apiLog, null, 2));
  console.log(`\nCaptured ${apiLog.length} API calls`);
  
  await browser.close();
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
