import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 导航到数据集页面
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('.tree-header', { timeout: 8000 });
  
  // 点击新建数据集图标
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  
  // 截图
  await page.screenshot({ path: '/tmp/after_create_click.png', fullPage: true });
  
  // 查找所有可见的弹窗/抽屉/模态框
  const overlayElements = await page.evaluate(() => {
    const selectors = [
      '[class*="drawer"]:not([class*="close"])',
      '[class*="dialog"]',
      '[class*="modal"]',
      '[class*="overlay"]',
      '[class*="popup"]',
      '[class*="popper"]',
      '[role="dialog"]',
      '[class*="panel"]',
      '[class*="form"]'
    ];
    const results = [];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 50) {
          results.push({
            selector: sel,
            class: el.className?.substring?.(0, 80) || String(el.className).substring(0, 80),
            text: el.textContent?.trim()?.substring(0, 200),
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
            tag: el.tagName
          });
        }
      });
    }
    return results;
  });
  
  console.log('Visible overlays:');
  for (const o of overlayElements) {
    console.log(`  [${o.tag}] class="${o.class}" at (${o.rect.x},${o.rect.y}) ${o.rect.w}x${o.rect.h}`);
    console.log(`    text: "${o.text}"`);
    console.log();
  }
  
  // 查找所有输入框（可能在弹出的表单中）
  const allInputs = await page.locator('input:visible, .ed-select:visible, textarea:visible').all();
  console.log(`Visible inputs/selects: ${allInputs.length}`);
  for (const inp of allInputs) {
    const placeholder = await inp.getAttribute('placeholder').catch(() => '');
    const type = await inp.getAttribute('type').catch(() => '');
    const tag = await inp.evaluate(e => e.tagName);
    console.log(`  [${tag}] type=${type} placeholder="${placeholder}"`);
  }
  
  // 查找所有可见按钮
  const visibleBtns = await page.locator('button:visible, .ed-button:visible').all();
  console.log(`\nVisible buttons: ${visibleBtns.length}`);
  for (const btn of visibleBtns) {
    const text = (await btn.textContent().catch(() => ''))?.trim();
    if (text && text.length < 40) console.log(`  "${text}"`);
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
