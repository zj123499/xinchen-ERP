import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const TOKEN_FILE = '/tmp/dataease_token.txt';

const capturedAPIs = [];

async function login(page) {
  // 读取已有 token
  let tokenData = null;
  try { tokenData = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')); } catch(e) {}
  
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const url = page.url();
  if (url.includes('login')) {
    console.log('Logging in...');
    await page.fill('input', USER, { timeout: 5000 });
    const inputs = await page.locator('input').all();
    if (inputs.length >= 2) {
      await inputs[1].fill(PASS);
    }
    const loginBtn = page.locator('button').filter({ hasText: /登/ }).first();
    await loginBtn.click();
    await page.waitForTimeout(3000);
    console.log('Logged in, URL:', page.url());
  }
  
  // 获取最新 token
  const newTokenData = await page.evaluate(() => {
    const t = localStorage.getItem('de_v2_user.token') || localStorage.getItem('user.token');
    return t || '';
  });
  if (newTokenData) {
    writeFileSync(TOKEN_FILE, newTokenData);
    return newTokenData;
  }
  return tokenData;
}

async function getJWT() {
  try {
    const data = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
    return JSON.parse(data.v);
  } catch(e) { return ''; }
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // 捕获所有 de2api 请求
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/de2api/') && request.method() === 'POST') {
      const apiPath = url.substring(url.indexOf('/de2api/'));
      const postData = request.postData();
      console.log(`\n>>> ${request.method()} ${apiPath}`);
      if (postData) console.log('   Body:', postData.substring(0, 300));
    }
  });
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/de2api/') && response.request().method() === 'POST') {
      const apiPath = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await response.text();
        const truncated = body.substring(0, 500);
        console.log(`<<< ${response.status()} ${apiPath}`);
        console.log(`    Response: ${truncated}`);
        capturedAPIs.push({ api: apiPath, status: response.status(), body: truncated });
      } catch(e) {}
    }
  });
  
  await login(page);
  
  // 进入数据集管理页面
  console.log('\n=== Going to dataset management ===');
  await page.goto(BASE + '/#/dataset', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // 查找并点击"新建数据集"按钮
  const allButtons = await page.locator('button, .el-button, span, a, div[role="button"]').all();
  console.log('\nAll clickable elements on dataset page:');
  for (const btn of allButtons) {
    try {
      const text = (await btn.textContent())?.trim();
      if (text && text.length > 0 && text.length < 30) {
        const tag = await btn.evaluate(el => el.tagName);
        console.log(`  [${tag}] "${text}"`);
      }
    } catch(e) {}
  }
  
  // 尝试多种方式找到创建按钮
  console.log('\n=== Trying to find "新建数据集" button ===');
  
  // 方法1: 查找包含"新建"和"数据集"的按钮
  let createBtn = page.locator('button, span, div').filter({ hasText: /新建数据集|创建数据集|添加数据集/ }).first();
  
  if (!(await createBtn.isVisible().catch(() => false))) {
    // 方法2: 查找只有"新建"的按钮
    createBtn = page.locator('button, span, div').filter({ hasText: /^新建$/ }).first();
  }
  
  if (!(await createBtn.isVisible().catch(() => false))) {
    // 方法3: 查找 + 号或添加图标按钮
    createBtn = page.locator('i, svg, button').filter({ hasText: '+' }).first();
  }
  
  if (await createBtn.isVisible().catch(() => false)) {
    console.log('Found create button, clicking...');
    await createBtn.click();
    await page.waitForTimeout(3000);
    console.log('Clicked, current URL:', page.url());
  } else {
    console.log('Could not find create button');
    // 直接导航到创建页面
    await page.goto(BASE + '/#/dataset-form', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  }
  
  await page.screenshot({ path: '/tmp/de_dataset_create.png', fullPage: false });
  console.log('Screenshot saved to /tmp/de_dataset_create.png');
  
  // 保存所有捕获的 API
  writeFileSync('/tmp/captured_apis.json', JSON.stringify(capturedAPIs, null, 2));
  console.log(`\nCaptured ${capturedAPIs.length} APIs`);
  
  console.log('\nBrowser open for inspection. Press Ctrl+C to exit.');
  // 保持浏览器打开
  await new Promise(() => {});
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
