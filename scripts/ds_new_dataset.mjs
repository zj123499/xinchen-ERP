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
  const tokenData = await page.evaluate(() => localStorage.getItem('de_v2_user.token') || '');
  if (tokenData) writeFileSync('/tmp/dataease_token_raw.txt', tokenData);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (!['font','typeface','sysParameter','license','msg-center','store','login','dekey','model','xpackModel','i18nOptions','defaultSettings','ui','shareBase','aiBase','sqlbot','defaultFont','interactiveTree','exportCenter'].some(s => url.includes(s))) {
          console.log(`\nAPI: ${path}`);
          console.log(body.substring(0, 800));
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 进入数据源详情页
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const dsPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据源' }).first();
  await dsPopup.click();
  await page.waitForTimeout(3000);
  
  // 点击"新辰未来"
  const xcNode = page.locator('span, div').filter({ hasText: /^新辰未来$/ }).first();
  if (await xcNode.isVisible({ timeout: 5000 }).catch(() => false)) {
    await xcNode.click();
    await page.waitForTimeout(3000);
  }
  
  // 查看所有按钮
  const buttons = await page.locator('button, .ed-button').all();
  console.log('Buttons on datasource page:');
  for (const btn of buttons) {
    const text = (await btn.textContent().catch(() => ''))?.trim();
    const visible = await btn.isVisible().catch(() => false);
    if (visible && text && text.length < 30) {
      console.log(`  "${text}"`);
    }
  }
  
  // 点击"新建数据集"按钮
  const newDsBtn = page.locator('button').filter({ hasText: '新建数据集' }).first();
  if (await newDsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('\nClicking 新建数据集...');
    await newDsBtn.click();
    await page.waitForTimeout(3000);
    
    console.log('URL:', page.url());
    await page.screenshot({ path: '/tmp/after_new_ds_btn.png', fullPage: true });
    
    // 查看是否出现新页面或对话框
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('Page:\n', pageText);
  }
  
  // 查看"数据源表"标签
  const tableTab = page.locator('div, span').filter({ hasText: '数据源表' }).first();
  if (await tableTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('\nClicking 数据源表 tab...');
    await tableTab.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/ds_table_tab.png', fullPage: true });
    
    const tableTabText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
    console.log('Table tab:\n', tableTabText);
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
