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
        if (!['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`\nAPI: ${path}`);
          console.log(body.substring(0, 500));
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 导航到数据集页面
  console.log('\n=== Navigate to dataset ===');
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  
  // 等待 tree-header
  await page.waitForSelector('.tree-header', { timeout: 8000 });
  console.log('On dataset page!');
  
  // tree-header 中有两个图标按钮：
  // 第一个: 文件夹图标 -> 新建文件夹
  // 第二个: 文件+图标 -> 新建数据集
  // 通过 data-v-213386cd 属性找到它们
  
  const treeHeader = page.locator('.tree-header');
  const icons = treeHeader.locator('.custom-icon.btn');
  const iconCount = await icons.count();
  console.log(`Found ${iconCount} icon buttons in tree-header`);
  
  // 查看每个 icon 的 SVG 内容来区分
  for (let i = 0; i < iconCount; i++) {
    const svgContent = await icons.nth(i).locator('svg').evaluate(el => {
      // 查看 path 的 d 属性来区分图标
      const paths = Array.from(el.querySelectorAll('path, rect'));
      return paths.map(p => p.getAttribute('d')?.substring(0, 30)).filter(Boolean);
    });
    console.log(`Icon ${i}: paths = ${JSON.stringify(svgContent)}`);
  }
  
  // 第二个图标 (index 1) 应该是"新建数据集"
  // 路径包含 "M14.5833 12.5" 开头的是文件+图标
  if (iconCount >= 2) {
    console.log('\n=== Clicking "新建数据集" icon (index 1) ===');
    
    // 使用 force 点击避免被遮挡
    await icons.nth(1).click({ force: true });
    await page.waitForTimeout(3000);
    
    // 检查是否有对话框弹出
    await page.screenshot({ path: '/tmp/create_ds_dialog.png', fullPage: true });
    
    // 查找对话框
    const dialogs = await page.locator('[role="dialog"]').all();
    console.log(`Dialogs open: ${dialogs.length}`);
    for (const d of dialogs) {
      const visible = await d.isVisible().catch(() => false);
      if (visible) {
        const label = await d.getAttribute('aria-label').catch(() => '');
        const text = (await d.textContent().catch(() => ''))?.trim()?.substring(0, 500);
        console.log(`Dialog [${label}]: "${text}"`);
      }
    }
    
    // 查找所有可见的对话框元素
    const visibleDialogs = page.locator('[role="dialog"]:visible, .ed-dialog:visible, .ed-drawer:visible');
    const vdCount = await visibleDialogs.count();
    console.log(`Visible dialogs: ${vdCount}`);
    
    if (vdCount > 0) {
      // 分析对话框内容
      for (let i = 0; i < vdCount; i++) {
        const d = visibleDialogs.nth(i);
        const html = await d.evaluate(el => el.outerHTML.substring(0, 2000));
        console.log(`Dialog ${i} HTML:`, html);
        
        // 查找对话框中的表单元素
        const inputs = d.locator('input, select, .ed-select, textarea');
        const inputCount = await inputs.count();
        console.log(`  Inputs: ${inputCount}`);
        for (let j = 0; j < inputCount; j++) {
          const inp = inputs.nth(j);
          const placeholder = await inp.getAttribute('placeholder').catch(() => '');
          const type = await inp.getAttribute('type').catch(() => '');
          const tag = await inp.evaluate(e => e.tagName);
          console.log(`    ${tag} type=${type} placeholder="${placeholder}"`);
        }
        
        // 查找按钮
        const buttons = d.locator('button, .ed-button');
        const btnCount = await buttons.count();
        console.log(`  Buttons: ${btnCount}`);
        for (let j = 0; j < btnCount; j++) {
          const btn = buttons.nth(j);
          const text = (await btn.textContent().catch(() => ''))?.trim();
          console.log(`    "${text}"`);
        }
      }
    }
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
