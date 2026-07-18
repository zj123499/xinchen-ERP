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
  
  const bizAPIs = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    const skip = ['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'];
    if (url.includes('/de2api/') && resp.request().method() === 'POST' && !skip.some(s => url.includes(s))) {
      try {
        const body = await resp.text();
        if (body.length < 8000) {
          bizAPIs.push({ path: url.substring(url.indexOf('/de2api/')), body });
          console.log(`\nAPI: ${url.substring(url.indexOf('/de2api/'))}`);
          console.log(body.substring(0, 500));
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 进入数据集页面
  console.log('\n=== Step 1: Navigate to dataset ===');
  await page.goto(BASE + '/#/data/dataset', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // 截图看当前页面
  await page.screenshot({ path: '/tmp/step1_dataset.png', fullPage: true });
  
  // 点击左侧"【官方示例】"看看有没有展开操作
  const demoNode = page.locator('span, div').filter({ hasText: '【官方示例】' }).first();
  if (await demoNode.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found 官方示例 node');
    
    // 先展开
    await demoNode.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/step2_expanded.png', fullPage: true });
    
    // 查看展开后的内容
    const expandedText = await page.evaluate(() => {
      const tree = document.querySelector('[class*="tree"]');
      return tree ? tree.innerText.substring(0, 500) : 'no tree found';
    });
    console.log('Tree content:', expandedText);
  }
  
  // 查看左侧是否有"+"或"新建"按钮
  // 通常DataEase的树组件上方有操作按钮
  const treeHeader = await page.evaluate(() => {
    const headers = document.querySelectorAll('[class*="header"], [class*="title"], [class*="toolbar"], [class*="action"]');
    return Array.from(headers).map(h => ({
      class: h.className?.substring(0, 80),
      text: h.textContent?.trim()?.substring(0, 100),
      innerHTML: h.innerHTML?.substring(0, 200)
    }));
  });
  console.log('\nTree headers/toolbars:', JSON.stringify(treeHeader, null, 2));
  
  // 查找所有SVG图标（可能是+号）
  const svgIcons = await page.evaluate(() => {
    const svgs = document.querySelectorAll('svg, [class*="icon"], i');
    return Array.from(svgs).slice(0, 20).map(s => ({
      class: s.className?.baseVal || s.className?.substring(0, 60),
      parentClass: s.parentElement?.className?.substring(0, 60)
    }));
  });
  console.log('SVG icons:', JSON.stringify(svgIcons, null, 2));
  
  // 直接查找包含"新建"的元素，通过点击数据集节点旁边可能的按钮
  // 尝试右键点击"【官方示例】"看上下文菜单
  await demoNode.click({ button: 'right' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/step3_context.png', fullPage: true });
  
  const contextMenu = await page.evaluate(() => {
    const menus = document.querySelectorAll('[class*="context"], [class*="dropdown"], [class*="popup"], [class*="popper"]');
    return Array.from(menus).filter(m => m.offsetHeight > 0).map(m => ({
      class: m.className?.substring(0, 80),
      text: m.textContent?.trim()?.substring(0, 200)
    }));
  });
  console.log('Context menus:', JSON.stringify(contextMenu, null, 2));
  
  writeFileSync('/tmp/biz_apis_final.json', JSON.stringify(bizAPIs, null, 2));
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
