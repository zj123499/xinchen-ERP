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
  
  const allAPIs = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        allAPIs.push({ path, status: resp.status(), body: body.substring(0, 2000) });
        if (!['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`\nAPI: ${path} -> ${body.substring(0, 400)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // Step 1: Hover "数据准备" -> 点击"数据集"
  console.log('\n=== Step 1: Navigate to dataset via hover menu ===');
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1500);
  
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  
  // 等待 tree-header 出现
  try {
    await page.waitForSelector('.tree-header', { timeout: 8000 });
    console.log('tree-header visible!');
  } catch(e) {
    console.log('tree-header timeout');
  }
  
  await page.screenshot({ path: '/tmp/full_dataset.png', fullPage: true });
  
  // 分析 tree-header 中的按钮
  const treeHeaderHTML = await page.evaluate(() => {
    const h = document.querySelector('.tree-header');
    return h ? h.outerHTML.substring(0, 2000) : 'NOT FOUND';
  });
  console.log('Tree header HTML:', treeHeaderHTML);
  
  // 查找 tree-header 内的图标按钮
  const iconsInTreeHeader = await page.evaluate(() => {
    const h = document.querySelector('.tree-header');
    if (!h) return [];
    return Array.from(h.querySelectorAll('i, svg, [class*="icon"]')).map(el => ({
      tag: el.tagName,
      class: typeof el.className === 'string' ? el.className : String(el.className?.baseVal || ''),
      outerHTML: el.outerHTML?.substring(0, 200),
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className?.substring?.(0, 60) || ''
    }));
  });
  console.log('\nIcons in tree-header:', JSON.stringify(iconsInTreeHeader, null, 2));
  
  // 点击 tree-header 中看起来像添加的图标
  if (iconsInTreeHeader.length > 0) {
    // 找到有 add/create/plus 相关 class 的
    const treeHeaderEl = page.locator('.tree-header');
    const allIcons = treeHeaderEl.locator('i, svg');
    const count = await allIcons.count();
    console.log(`\nIcons count in tree-header: ${count}`);
    
    for (let i = 0; i < count; i++) {
      const icon = allIcons.nth(i);
      const cls = await icon.getAttribute('class').catch(() => '');
      console.log(`Icon ${i}: class="${cls?.substring(0, 80)}"`);
      
      // 尝试点击每个图标
      await icon.click();
      await page.waitForTimeout(2000);
      
      const newDialogs = await page.locator('[class*="dialog"], [class*="drawer"], [class*="modal"], [class*="popup"]').all();
      for (const d of newDialogs) {
        const visible = await d.isVisible().catch(() => false);
        if (visible) {
          const text = (await d.textContent().catch(() => ''))?.trim()?.substring(0, 300);
          console.log(`  Dialog appeared: "${text}"`);
          await page.screenshot({ path: `/tmp/icon_${i}_click.png`, fullPage: true });
        }
      }
    }
  }
  
  writeFileSync('/tmp/all_apis_capture.json', JSON.stringify(allAPIs, null, 2));
  console.log(`\nTotal APIs captured: ${allAPIs.length}`);
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
