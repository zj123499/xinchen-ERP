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
  
  // 点击新建数据集
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 截图看初始状态
  await page.screenshot({ path: '/tmp/form_initial.png', fullPage: true });
  
  // 检查 select-ds 区域的完整 HTML
  const selectDsHTML = await page.evaluate(() => {
    const el = document.querySelector('.select-ds');
    if (!el) return 'NOT FOUND';
    // 获取父容器
    const parent = el.closest('[class*="table-list"]') || el.parentElement;
    return {
      selectDs: el.outerHTML.substring(0, 500),
      parentHTML: parent?.outerHTML?.substring(0, 1000)
    };
  });
  console.log('Select DS area:');
  console.log(JSON.stringify(selectDsHTML, null, 2));
  
  // 点击"选择数据源" - 看会发生什么
  const selectDs = page.locator('.select-ds').first();
  await selectDs.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/after_select_ds_click.png', fullPage: true });
  
  // 查看是否弹出了新面板/对话框
  const newPanels = await page.evaluate(() => {
    const panels = document.querySelectorAll('[class*="drawer"], [class*="dialog"], [class*="modal"], [class*="panel"], [class*="tree"]');
    return Array.from(panels).filter(p => {
      const rect = p.getBoundingClientRect();
      return rect.width > 100 && rect.height > 100;
    }).map(p => ({
      class: p.className?.substring?.(0, 80) || String(p.className).substring(0, 80),
      text: p.textContent?.trim()?.substring(0, 300),
      rect: { x: Math.round(p.getBoundingClientRect().x), y: Math.round(p.getBoundingClientRect().y), w: Math.round(p.getBoundingClientRect().width), h: Math.round(p.getBoundingClientRect().height) }
    }));
  });
  
  console.log('\nVisible panels after clicking 选择数据源:');
  for (const p of newPanels) {
    console.log(`  [${p.rect.x},${p.rect.y} ${p.rect.w}x${p.rect.h}] "${p.class}"`);
    console.log(`    ${p.text.substring(0, 200)}`);
  }
  
  // 查看数据源树是否出现了
  const dsTreeItems = await page.locator('[class*="datasource"] span, [class*="tree"] span').filter({ hasText: /新辰未来|Demo/ }).all();
  console.log(`\nDS tree items with 新辰未来/Demo: ${dsTreeItems.length}`);
  for (const item of dsTreeItems) {
    const text = (await item.textContent().catch(() => ''))?.trim();
    const visible = await item.isVisible().catch(() => false);
    console.log(`  "${text}" visible=${visible}`);
    if (visible && text === '新辰未来') {
      console.log('  -> Clicking!');
      await item.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/after_select_xc.png', fullPage: true });
    }
  }
  
  // 检查 select-ds 文本是否变化
  const newDsText = await selectDs.textContent().catch(() => '');
  console.log(`\nSelect DS text after: "${newDsText}"`);
  
  // 查看表搜索区域
  const tableArea = await page.evaluate(() => {
    const search = document.querySelector('input[placeholder*="表名称"]');
    const list = document.querySelector('[class*="table-list"]');
    return {
      searchExists: !!search,
      listText: list?.textContent?.trim()?.substring(0, 300)
    };
  });
  console.log('Table area:', JSON.stringify(tableArea, null, 2));
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
