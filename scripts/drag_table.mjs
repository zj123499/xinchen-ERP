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
  
  // 设置名称
  await page.evaluate(() => {
    const span = document.querySelector('.dataset-name.ellipsis');
    if (span) span.textContent = '返佣记录';
  });
  
  // 选择数据源
  const dsInput = page.locator('.table-list-top .ed-select__input').first();
  await dsInput.click();
  await page.waitForTimeout(1000);
  const xcOption = page.locator('.ed-select-dropdown__item, .ed-tree-node__content').filter({ hasText: '新辰未来' }).first();
  await xcOption.click({ force: true });
  await page.waitForTimeout(2000);
  
  // 搜索表
  const tableSearch = page.locator('input[placeholder*="表名称"]').first();
  await tableSearch.fill('rebates');
  await page.waitForTimeout(2000);
  
  // 查找表项 - 在左侧表列表中
  const tableItem = page.locator('span, div').filter({ hasText: /^rebates$/ }).first();
  const tableBox = await tableItem.boundingBox().catch(() => null);
  console.log('Table item box:', tableBox);
  
  // 查找中间拖拽区域
  const dropZone = page.locator('[class*="center"], [class*="drop"], [class*="canvas"], [class*="drag"]').filter({ hasText: /拖拽/ }).first();
  const dropBox = await dropZone.boundingBox().catch(() => null);
  console.log('Drop zone box:', dropBox);
  
  if (tableBox && dropBox) {
    // 拖拽表到中间区域
    console.log('Dragging table to drop zone...');
    await page.mouse.move(tableBox.x + tableBox.width / 2, tableBox.y + tableBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    
    // 慢慢移动到目标
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const x = tableBox.x + tableBox.width / 2 + (dropBox.x + dropBox.width / 2 - tableBox.x - tableBox.width / 2) * i / steps;
      const y = tableBox.y + tableBox.height / 2 + (dropBox.y + dropBox.height / 2 - tableBox.y - tableBox.height / 2) * i / steps;
      await page.mouse.move(x, y);
      await page.waitForTimeout(50);
    }
    
    await page.mouse.up();
    await page.waitForTimeout(2000);
    console.log('Drag complete');
  } else {
    // 查找拖拽区域的另一种方式
    const centerAreaHTML = await page.evaluate(() => {
      const areas = document.querySelectorAll('[class*="main"], [class*="center"], [class*="canvas"], [class*="field-list"]');
      return Array.from(areas).map(a => ({
        class: a.className?.substring?.(0, 80),
        text: a.textContent?.trim()?.substring(0, 100),
        rect: (() => { const r = a.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; })()
      }));
    });
    console.log('Center areas:', JSON.stringify(centerAreaHTML, null, 2));
    
    // 尝试另一种方法：通过 JavaScript 直接触发添加
    // 查找表项上的点击事件
    const tableSpan = page.locator(`text="rebates"`).first();
    const tBox = await tableSpan.boundingBox().catch(() => null);
    if (tBox) {
      console.log(`Table span at (${tBox.x}, ${tBox.y}), clicking...`);
      await tableSpan.click();
      await page.waitForTimeout(1000);
      
      // 查找是否有"添加"或"确认"按钮
      const addBtns = await page.locator('button, span').filter({ hasText: /添加|确定|加入|选择/ }).all();
      for (const btn of addBtns) {
        const text = (await btn.textContent().catch(() => ''))?.trim();
        console.log(`  Button: "${text}"`);
      }
    }
  }
  
  await page.screenshot({ path: '/tmp/drag_result.png', fullPage: true });
  
  // 尝试保存
  const saveBtn = page.locator('button').filter({ hasText: /^保存$/ }).first();
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
    const msgs = await page.locator('[class*="message"]').all();
    for (const m of msgs) {
      const t = (await m.textContent().catch(() => ''))?.trim();
      if (t) console.log('Msg:', t);
    }
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
