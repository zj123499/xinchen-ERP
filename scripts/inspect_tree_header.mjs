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
  
  await login(page);
  await page.goto(BASE + '/#/data/dataset', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // 深入分析 tree-header
  const treeHeaderInfo = await page.evaluate(() => {
    const header = document.querySelector('.tree-header');
    if (!header) return { error: 'tree-header not found' };
    return {
      outerHTML: header.outerHTML,
      innerHTML: header.innerHTML,
      children: Array.from(header.children).map(c => ({
        tag: c.tagName,
        class: c.className,
        text: c.textContent?.trim()?.substring(0, 30),
        innerHTML: c.innerHTML?.substring(0, 300)
      })),
      // 查找所有后代按钮
      buttons: Array.from(header.querySelectorAll('button, i, svg, [class*="btn"], [class*="icon"]')).map(b => ({
        tag: b.tagName,
        class: b.className?.substring(0, 80),
        text: b.textContent?.trim()?.substring(0, 20),
        title: b.getAttribute('title'),
        outerHTML: b.outerHTML?.substring(0, 200)
      }))
    };
  });
  
  console.log('Tree header analysis:');
  console.log(JSON.stringify(treeHeaderInfo, null, 2));
  
  // 尝试点击 tree-header 中的按钮
  const treeHeader = page.locator('.tree-header');
  if (await treeHeader.isVisible().catch(() => false)) {
    // 查找 tree-header 内的所有可点击元素
    const clickableEls = treeHeader.locator('i, svg, button, [class*="btn"]');
    const count = await clickableEls.count();
    console.log(`\nClickable elements in tree-header: ${count}`);
    
    for (let i = 0; i < count; i++) {
      const el = clickableEls.nth(i);
      const cls = await el.getAttribute('class').catch(() => '');
      const title = await el.getAttribute('title').catch(() => '');
      console.log(`  [${i}] class="${cls?.substring(0,60)}" title="${title}"`);
      
      // 点击看起来像"新建"的按钮
      if (cls?.includes('add') || cls?.includes('create') || cls?.includes('plus') || cls?.includes('new') || title?.includes('新建') || title?.includes('创建') || title?.includes('添加')) {
        console.log(`  -> Clicking [${i}]!`);
        await el.click();
        await page.waitForTimeout(3000);
        
        const pageText = await page.evaluate(() => document.body.innerText.substring(0, 1500));
        console.log('After click:\n', pageText);
        await page.screenshot({ path: '/tmp/after_create_click.png', fullPage: true });
        break;
      }
    }
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
