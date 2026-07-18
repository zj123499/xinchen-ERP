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
        if (body.length < 8000 && !['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`\nAPI: ${path}`);
          console.log(body.substring(0, 800));
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  
  // 进入数据集页面
  await page.goto(BASE + '/#/data/dataset', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // 分析完整页面 HTML 找创建按钮
  const fullHTML = await page.content();
  writeFileSync('/tmp/dataset_page_full.html', fullHTML);
  
  // 查找页面中的所有交互元素
  const allElements = await page.evaluate(() => {
    const elements = document.querySelectorAll('button, a, [class*="btn"], [class*="create"], [class*="add"], [class*="new"]');
    return Array.from(elements).map(el => ({
      tag: el.tagName,
      text: el.textContent?.trim()?.substring(0, 50),
      class: el.className?.substring(0, 80),
      id: el.id,
      rect: el.getBoundingClientRect()
    }));
  });
  
  console.log('\nAll potential action elements:');
  for (const el of allElements) {
    if (el.text && el.text.length > 0 && el.rect.width > 0 && el.rect.height > 0) {
      console.log(`  [${el.tag}] "${el.text}" class="${el.class}" at (${Math.round(el.rect.x)},${Math.round(el.rect.y)})`);
    }
  }
  
  // 尝试点击"新建数据集"按钮 - 可能在页面上方或左侧
  // 查看截图了解页面布局
  await page.screenshot({ path: '/tmp/dataset_full.png', fullPage: true });
  
  // 寻找"新建"或"+"
  const createBtn = page.locator('button, span, div').filter({ hasText: /新建数据集|创建数据集|新建/ }).first();
  if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('\nFound create button!');
    const text = await createBtn.textContent();
    console.log(`Button text: "${text}"`);
    await createBtn.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/tmp/create_dialog.png', fullPage: true });
    console.log('After click, URL:', page.url());
    
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('Page:\n', pageText);
  }
  
  // 如果没找到新建按钮，检查左侧树上方是否有按钮
  const leftAreaBtns = await page.locator('[class*="left"] button, [class*="tree"] button, [class*="side"] button, [class*="panel"] button').all();
  console.log(`\nLeft area buttons: ${leftAreaBtns.length}`);
  for (const btn of leftAreaBtns) {
    const text = (await btn.textContent().catch(() => ''))?.trim();
    if (text) console.log(`  "${text}"`);
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
