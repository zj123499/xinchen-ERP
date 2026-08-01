import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

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
          console.log(`API: ${path} -> ${body.substring(0, 300)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 导航到数据集
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('.tree-header', { timeout: 8000 });
  
  // 点击新建数据集
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 点击 "请选择数据源" 旁边的箭头图标
  const leftOutlined = page.locator('.left-outlined').first();
  console.log('Clicking left-outlined icon...');
  await leftOutlined.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/after_left_outlined.png', fullPage: true });
  
  // 查看页面变化
  const allVisibleText = await page.evaluate(() => {
    // 获取所有可见的大面板
    const panels = document.querySelectorAll('[class*="table-list"], [class*="tree"], [class*="panel"], [class*="source"]');
    return Array.from(panels).map(p => {
      const rect = p.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) {
        return {
          class: p.className?.substring?.(0, 80),
          text: p.textContent?.trim()?.substring(0, 200),
          size: `${Math.round(rect.width)}x${Math.round(rect.height)}`
        };
      }
      return null;
    }).filter(Boolean);
  });
  console.log('Visible panels:');
  for (const p of allVisibleText) {
    console.log(`  [${p.size}] ${p.class}`);
    console.log(`    ${p.text}`);
  }
  
  // 查找所有包含"新辰未来"的元素（无论可见性）
  const xcElements = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    return Array.from(all).filter(el => 
      el.textContent?.trim() === '新辰未来' && el.children.length === 0
    ).map(el => ({
      tag: el.tagName,
      class: el.className?.substring?.(0, 80),
      visible: el.offsetParent !== null,
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className?.substring?.(0, 80),
      grandparentTag: el.parentElement?.parentElement?.tagName,
      grandparentClass: el.parentElement?.parentElement?.className?.substring?.(0, 80)
    }));
  });
  console.log('\n新辰未来 elements:');
  console.log(JSON.stringify(xcElements, null, 2));
  
  // 尝试在页面上查找数据源树
  const dsTreeRoot = await page.evaluate(() => {
    // 查找包含树节点的容器
    const containers = document.querySelectorAll('[class*="tree"], [class*="node"]');
    return Array.from(containers).map(c => ({
      class: c.className?.substring?.(0, 80),
      visible: c.offsetParent !== null,
      innerText: c.innerText?.substring(0, 200)
    }));
  });
  console.log('\nTree containers:');
  for (const c of dsTreeRoot) {
    console.log(`  visible=${c.visible} class="${c.class}"`);
    console.log(`    "${c.innerText}"`);
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
