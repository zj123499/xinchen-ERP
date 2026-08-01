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
  
  // 收集所有 API
  page.on('response', async (resp) => {
    const url = resp.url();
    const skip = ['font', 'typeface', 'sysParameter', 'license', 'msg-center', 'store', 'login', 'dekey', 'model', 'xpackModel', 'i18nOptions', 'defaultSettings', 'ui', 'shareBase', 'aiBase', 'sqlbot', 'defaultFont', 'interactiveTree'];
    if (url.includes('/de2api/') && resp.request().method() === 'POST' && !skip.some(s => url.includes(s))) {
      try {
        const body = await resp.text();
        if (body.length < 5000) {
          console.log(`\nAPI: ${url.substring(url.indexOf('/de2api/'))} -> ${body.substring(0, 300)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 分析左侧导航结构
  const sidebarInfo = await page.evaluate(() => {
    const navAreas = document.querySelectorAll('nav, aside, [class*="sidebar"], [class*="side"], [class*="menu"], [class*="nav"]');
    const results = [];
    navAreas.forEach(area => {
      const links = area.querySelectorAll('a, [class*="item"], [class*="link"], li, div[role]');
      const items = [];
      links.forEach(link => {
        const text = link.textContent?.trim();
        const cls = link.className;
        if (text && text.length < 30 && text.length > 0) {
          items.push({ text, cls: cls?.substring(0, 60) });
        }
      });
      if (items.length > 0) {
        results.push({ area: area.className?.substring(0, 80), items });
      }
    });
    return results;
  });
  
  console.log('Sidebar structure:');
  console.log(JSON.stringify(sidebarInfo, null, 2));
  
  // 找到所有链接
  const allLinks = await page.locator('a, [role="link"]').all();
  console.log('\nAll links:');
  for (const link of allLinks) {
    const text = (await link.textContent().catch(() => ''))?.trim();
    const href = await link.getAttribute('href').catch(() => '');
    if (text && text.length < 30) {
      console.log(`  "${text}" -> ${href}`);
    }
  }
  
  // 尝试点击"数据准备"旁边的箭头展开子菜单
  const dataPrepEls = await page.locator('div, span, li').filter({ hasText: /^数据准备$/ }).all();
  console.log(`\nFound ${dataPrepEls.length} "数据准备" elements`);
  
  for (const el of dataPrepEls) {
    const parent = await el.evaluateHandle(e => e.parentElement);
    const parentHTML = await parent.evaluate(e => e.outerHTML.substring(0, 300));
    console.log('Parent HTML:', parentHTML);
    
    // 查找父元素中的箭头/展开图标
    const arrow = await parent.evaluate(e => {
      const icons = e.querySelectorAll('i, svg, [class*="arrow"], [class*="icon"], [class*="expand"], [class*="caret"]');
      return Array.from(icons).map(i => ({ tag: i.tagName, cls: i.className?.substring(0, 60) }));
    });
    console.log('Child icons:', JSON.stringify(arrow));
    
    // 点击父元素
    try {
      await parent.asElement().click();
      console.log('Clicked parent of 数据准备');
      await page.waitForTimeout(2000);
      break;
    } catch(e) {
      console.log('Click failed:', e.message);
    }
  }
  
  // 查看子菜单是否展开了
  const expandedMenu = await page.evaluate(() => {
    const items = document.querySelectorAll('[class*="sub"], [class*="child"], [class*="nest"], .ed-menu .ed-submenu, .el-menu .el-submenu');
    return Array.from(items).map(i => ({ cls: i.className?.substring(0, 80), text: i.textContent?.trim()?.substring(0, 50) }));
  });
  console.log('\nExpanded menu items:', JSON.stringify(expandedMenu, null, 2));
  
  await page.screenshot({ path: '/tmp/sidebar_expanded.png', fullPage: true });
  
  // 查找"数据源"子菜单项
  const dsSubItem = page.locator('li, div, span').filter({ hasText: /^数据源$/ }).first();
  if (await dsSubItem.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Found 数据源 sub-item, clicking...');
    await dsSubItem.click();
    await page.waitForTimeout(3000);
    console.log('URL after clicking 数据源:', page.url());
    
    // 查找"新辰未来"
    const xcEl = page.locator('span, div, td').filter({ hasText: '新辰未来' }).first();
    if (await xcEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found 新辰未来!');
      await xcEl.click();
      await page.waitForTimeout(3000);
      console.log('URL after clicking 新辰未来:', page.url());
      
      const pageText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
      console.log('Page content:\n', pageText);
    }
  }
  
  await page.screenshot({ path: '/tmp/datasource_detail.png', fullPage: true });
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
