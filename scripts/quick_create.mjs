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
  
  // 收集业务 API
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (body.length < 5000 && !['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`\n=== API: ${path} ===`);
          console.log(body.substring(0, 600));
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 在工作台的"快速创建"区域点击"数据集"
  console.log('\n=== Clicking 数据集 in quick create ===');
  
  // 使用 quick-creation 内的"数据集"元素
  const quickCreateSection = page.locator('.quick-creation');
  const datasetItem = quickCreateSection.locator('.item').filter({ hasText: '数据集' }).first();
  
  if (await datasetItem.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found 数据集 in quick create');
    await datasetItem.click();
    await page.waitForTimeout(5000);
    console.log('URL after click:', page.url());
    
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('Page content:\n', pageText);
    
    await page.screenshot({ path: '/tmp/quick_create_dataset.png', fullPage: true });
    
    // 检查是否出现了创建数据集的表单/对话框
    // 查找对话框中的元素
    const dialogs = await page.locator('[class*="dialog"], [class*="drawer"], [class*="modal"]').all();
    console.log(`\nDialogs found: ${dialogs.length}`);
    for (const d of dialogs) {
      const text = (await d.textContent().catch(() => ''))?.trim()?.substring(0, 200);
      const cls = await d.getAttribute('class').catch(() => '');
      const visible = await d.isVisible().catch(() => false);
      if (visible) console.log(`Dialog [${cls?.substring(0,60)}]: "${text}"`);
    }
    
    // 查找所有 select, input, button
    const formEls = await page.locator('select, input, .ed-select, .ed-button, button').all();
    console.log('\nForm elements:');
    for (const el of formEls) {
      const visible = await el.isVisible().catch(() => false);
      if (!visible) continue;
      const tag = await el.evaluate(e => e.tagName);
      const cls = await el.getAttribute('class').catch(() => '');
      const placeholder = await el.getAttribute('placeholder').catch(() => '');
      const text = (await el.textContent().catch(() => ''))?.trim()?.substring(0, 30);
      if (text || placeholder) {
        console.log(`  [${tag}] "${text || ''}" placeholder="${placeholder || ''}" class="${cls?.substring(0,60)}"`);
      }
    }
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
