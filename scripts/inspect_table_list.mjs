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
  
  // 不搜索，先看表列表结构
  await page.screenshot({ path: '/tmp/table_list_initial.png', fullPage: true });
  
  // 分析表列表的 DOM 结构
  const tableListStructure = await page.evaluate(() => {
    const tableList = document.querySelector('.table-list');
    if (!tableList) return { error: 'no .table-list' };
    
    // 获取所有子元素
    const children = Array.from(tableList.children).map(c => ({
      tag: c.tagName,
      class: c.className?.substring?.(0, 80),
      text: c.textContent?.trim()?.substring(0, 50),
      rect: (() => {
        const r = c.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })()
    }));
    
    // 查找所有可拖拽的表项
    const draggableItems = Array.from(tableList.querySelectorAll('[draggable], [class*="drag"], [class*="item"]')).map(i => ({
      tag: i.tagName,
      class: i.className?.substring?.(0, 80),
      text: i.textContent?.trim()?.substring(0, 50),
      draggable: i.getAttribute('draggable'),
      rect: (() => {
        const r = i.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })()
    }));
    
    return { children, draggableItems };
  });
  
  console.log('Table list structure:');
  console.log(JSON.stringify(tableListStructure, null, 2));
  
  // 现在搜索 rebates
  const tableSearch = page.locator('input[placeholder*="表名称"]').first();
  await tableSearch.fill('rebates');
  await page.waitForTimeout(2000);
  
  // 再次分析
  const afterSearch = await page.evaluate(() => {
    const tableList = document.querySelector('.table-list');
    if (!tableList) return { error: 'no .table-list' };
    
    const items = Array.from(tableList.querySelectorAll('*')).filter(el => 
      el.textContent?.trim() === 'rebates' && el.children.length === 0
    ).map(el => ({
      tag: el.tagName,
      class: el.className?.substring?.(0, 80),
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className?.substring?.(0, 80),
      grandparentTag: el.parentElement?.parentElement?.tagName,
      grandparentClass: el.parentElement?.parentElement?.className?.substring?.(0, 80),
      rect: (() => {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      })()
    }));
    
    return { items };
  });
  
  console.log('\nAfter search - rebates items:');
  console.log(JSON.stringify(afterSearch, null, 2));
  
  await page.screenshot({ path: '/tmp/after_search_detail.png', fullPage: true });
  
  // 尝试直接点击"rebates"文字看会发生什么
  const rebatesText = page.locator('span').filter({ hasText: /^rebates$/ }).first();
  const rebatesBox = await rebatesText.boundingBox().catch(() => null);
  console.log('\nrebates span box:', rebatesBox);
  
  if (rebatesBox) {
    // 查看它的父元素
    const parentInfo = await rebatesText.evaluate(el => ({
      parentTag: el.parentElement?.tagName,
      parentClass: el.parentElement?.className?.substring?.(0, 100),
      parentHTML: el.parentElement?.outerHTML?.substring(0, 500)
    }));
    console.log('Parent:', JSON.stringify(parentInfo, null, 2));
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
