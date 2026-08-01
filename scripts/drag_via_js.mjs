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
          console.log(`API: ${path}`);
          console.log(body.substring(0, 500));
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
  
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 设置名称
  await page.evaluate(() => {
    document.querySelector('.dataset-name.ellipsis').textContent = '返佣记录';
  });
  
  // 选择数据源
  await page.locator('.table-list-top .ed-select__input').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.ed-select-dropdown__item, .ed-tree-node__content').filter({ hasText: '新辰未来' }).first().click({ force: true });
  await page.waitForTimeout(2000);
  
  // 搜索表
  await page.locator('input[placeholder*="表名称"]').first().fill('rebates');
  await page.waitForTimeout(2000);
  
  // 使用 HTML5 Drag and Drop API 模拟拖拽
  console.log('Simulating HTML5 drag and drop...');
  
  const dragResult = await page.evaluate(() => {
    return new Promise((resolve) => {
      // 找到表项
      const tableItem = document.querySelector('.list-item_primary');
      if (!tableItem) return resolve('No table item found');
      
      // 找到 drop zone
      const dropZone = document.querySelector('[class*="field-list"], [class*="center-area"], [class*="canvas"], .dataset-preview');
      if (!dropZone) {
        // 尝试找主区域
        const mainAreas = document.querySelectorAll('.de-dataset-form > div');
        let found = null;
        mainAreas.forEach(area => {
          if (area.textContent?.includes('拖拽')) found = area;
        });
        if (!found) return resolve('No drop zone found');
        
        // 创建 drag event
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', 'rebates');
        
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransfer
        });
        
        tableItem.dispatchEvent(dragStartEvent);
        
        setTimeout(() => {
          const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dataTransfer
          });
          found.dispatchEvent(dragOverEvent);
          
          setTimeout(() => {
            const dropEvent = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer
            });
            found.dispatchEvent(dropEvent);
            
            const dragEndEvent = new DragEvent('dragend', {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer
            });
            tableItem.dispatchEvent(dragEndEvent);
            
            resolve('Drag events dispatched');
          }, 100);
        }, 100);
      }
    });
  });
  
  console.log('Drag result:', dragResult);
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/tmp/after_js_drag.png', fullPage: true });
  
  // 检查中间区域是否有字段
  const centerText = await page.evaluate(() => {
    const centers = document.querySelectorAll('[class*="field"], [class*="preview"], [class*="table-area"]');
    return Array.from(centers).map(c => ({
      class: c.className?.substring?.(0, 60),
      text: c.textContent?.trim()?.substring(0, 100)
    }));
  });
  console.log('Center areas:', JSON.stringify(centerText, null, 2));
  
  // 尝试保存
  const saveBtn = page.locator('button').filter({ hasText: /^保存$/ }).first();
  await saveBtn.click();
  await page.waitForTimeout(3000);
  
  const msgs = await page.locator('[class*="message"]').all();
  for (const m of msgs) {
    const t = (await m.textContent().catch(() => ''))?.trim();
    if (t) console.log('Msg:', t);
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
