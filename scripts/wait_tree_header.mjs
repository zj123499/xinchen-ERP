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
        if (body.length < 5000 && !['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`API: ${path} -> ${body.substring(0, 300)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.goto(BASE + '/#/data/dataset', { waitUntil: 'networkidle', timeout: 30000 });
  
  // 等待 tree-header 出现
  try {
    await page.waitForSelector('.tree-header', { timeout: 10000 });
    console.log('tree-header found!');
  } catch(e) {
    console.log('tree-header not found after 10s, checking page...');
  }
  
  await page.waitForTimeout(2000);
  
  // 获取 tree-header 的完整 HTML
  const treeHeaders = await page.$$eval('.tree-header', els => 
    els.map(el => ({
      outerHTML: el.outerHTML.substring(0, 1000),
      allDescendants: Array.from(el.querySelectorAll('*')).map(d => ({
        tag: d.tagName,
        class: typeof d.className === 'string' ? d.className.substring(0, 60) : String(d.className).substring(0, 60),
        text: d.textContent?.trim()?.substring(0, 20),
        title: d.getAttribute('title') || ''
      }))
    }))
  );
  
  console.log('Tree headers:');
  for (const h of treeHeaders) {
    console.log(h.outerHTML);
    console.log('\nDescendants:');
    for (const d of h.allDescendants) {
      if (d.tag === 'I' || d.tag === 'SVG' || d.tag === 'BUTTON' || d.class.includes('btn') || d.class.includes('icon') || d.title) {
        console.log(`  ${d.tag} class="${d.class}" text="${d.text}" title="${d.title}"`);
      }
    }
  }
  
  // 截图
  await page.screenshot({ path: '/tmp/tree_header_detail.png', fullPage: true });
  
  // 查找所有包含"新建"文本的按钮
  const newBtns = await page.locator('button, span, i, div').filter({ hasText: /新建/ }).all();
  console.log(`\nElements with "新建": ${newBtns.length}`);
  for (const btn of newBtns) {
    const text = (await btn.textContent().catch(() => ''))?.trim();
    const tag = await btn.evaluate(e => e.tagName);
    const cls = await btn.getAttribute('class').catch(() => '');
    console.log(`  [${tag}] "${text}" class="${cls?.substring(0, 60)}"`);
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
