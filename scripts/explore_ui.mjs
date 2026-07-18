import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const DS_ID = '1273399598202884096';
const TOKEN_FILE = '/tmp/dataease_token.txt';

async function login(page) {
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const url = page.url();
  if (url.includes('login')) {
    console.log('On login page, filling credentials...');
    // 尝试多种选择器定位输入框
    const usernameInput = page.locator('input').first();
    const passwordInput = page.locator('input[type="password"]');
    
    await usernameInput.fill(USER);
    await passwordInput.fill(PASS);
    
    // 查找登录按钮 - DataEase v2 可能使用不同的按钮
    const loginBtn = page.locator('button').filter({ hasText: /登|Login|Sign/ }).first();
    await loginBtn.click();
    await page.waitForTimeout(3000);
    console.log('Login submitted, current URL:', page.url());
  } else {
    console.log('Already logged in, URL:', url);
  }
  
  // 获取 token
  const token = await page.evaluate(() => {
    return localStorage.getItem('de_v2_user.token') || localStorage.getItem('user.token') || '';
  });
  if (token) writeFileSync(TOKEN_FILE, token.trim());
  return token;
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // 监听网络请求，捕获 API 调用
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/de2api/') && response.status() === 200) {
      try {
        const body = await response.text();
        if (body.length < 2000 && !url.includes('.js') && !url.includes('.css')) {
          console.log('API:', url.substring(url.indexOf('/de2api/')), '|', body.substring(0, 200));
        }
      } catch(e) {}
    }
  });
  
  const token = await login(page);
  console.log('Token:', token?.substring(0, 50) + '...');
  
  // 导航到数据集页面
  console.log('\n=== Navigating to dataset page ===');
  await page.goto(BASE + '/#/dataset', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/de_dataset.png', fullPage: false });
  console.log('Dataset page screenshot saved');
  
  // 点击新建数据集按钮 - 尝试找到创建按钮
  const pageContent = await page.content();
  console.log('Page title:', await page.title());
  
  // 查找页面上的按钮
  const buttons = await page.locator('button, .el-button, [role="button"]').all();
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    if (text && text.trim()) {
      console.log('Button found:', text.trim().substring(0, 50));
    }
  }
  
  // 尝试点击创建数据集
  const createBtn = page.locator('button, span, a, div').filter({ hasText: /新建|创建|添加|数据集/ }).first();
  if (await createBtn.isVisible().catch(() => false)) {
    console.log('Clicking create button...');
    await createBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/de_create_dialog.png', fullPage: false });
  }
  
  console.log('\nDone. Browser stays open for manual inspection.');
  // await browser.close();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
