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
  
  const bizAPIs = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    const skip = ['font', 'typeface', 'sysParameter', 'license', 'msg-center', 'store', 'login', 'dekey', 'model', 'xpackModel', 'i18nOptions', 'defaultSettings', 'ui', 'shareBase', 'aiBase', 'sqlbot', 'defaultFont'];
    if (url.includes('/de2api/') && resp.request().method() === 'POST' && !skip.some(s => url.includes(s))) {
      try {
        const body = await resp.text();
        if (body.length < 5000) {
          const path = url.substring(url.indexOf('/de2api/'));
          bizAPIs.push({ path, body: body.substring(0, 2000) });
          console.log(`\n=== ${path} ===\n${body.substring(0, 500)}`);
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 在工作台找到"快速创建"区域下的"数据集"并点击
  console.log('\n=== Looking for quick create area ===');
  
  // 使用更精确的定位 - "快速创建"下方有"仪表板"、"数据大屏"、"数据集"、"数据源"
  // 先找到包含这些文字的 DOM 结构
  const quickCreateSection = await page.evaluate(() => {
    const body = document.body;
    // 找到所有包含"快速创建"的元素
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
    const results = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text === '快速创建' && node.children.length === 0) {
        // 找到"快速创建"的父容器
        let parent = node.parentElement;
        let depth = 0;
        while (parent && depth < 5) {
          const innerText = parent.innerText?.substring(0, 100);
          if (innerText.includes('仪表板') && innerText.includes('数据集') && innerText.includes('数据源')) {
            results.push({
              tag: parent.tagName,
              class: parent.className,
              text: parent.innerText?.substring(0, 200),
              children: Array.from(parent.querySelectorAll('*')).filter(c => c.children.length === 0).map(c => c.textContent?.trim()).filter(Boolean)
            });
            break;
          }
          parent = parent.parentElement;
          depth++;
        }
      }
    }
    return results;
  });
  
  console.log('Quick create sections found:', JSON.stringify(quickCreateSection, null, 2));
  
  // 尝试通过坐标点击"数据集"（在快速创建区域）
  // 先用 evaluate 找到"数据集"在快速创建中的位置
  const datasetEl = page.locator('span, div, p, a').filter({ hasText: /^数据集$/ }).first();
  if (await datasetEl.isVisible({ timeout: 3000 }).catch(() => false)) {
    const box = await datasetEl.boundingBox();
    console.log(`数据集 element at: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);
    await datasetEl.click();
    await page.waitForTimeout(3000);
    console.log('Clicked 数据集, URL:', page.url());
    
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Page after click:', pageText);
  } else {
    console.log('数据集 element not found directly');
    // 尝试查找所有包含"数据集"的元素
    const allDs = await page.locator('*').filter({ hasText: '数据集' }).all();
    console.log(`Found ${allDs.length} elements with "数据集" text`);
    for (let i = 0; i < Math.min(allDs.length, 10); i++) {
      const text = (await allDs[i].textContent().catch(() => ''))?.trim()?.substring(0, 30);
      const tag = await allDs[i].evaluate(e => e.tagName).catch(() => '?');
      const visible = await allDs[i].isVisible().catch(() => false);
      console.log(`  [${i}] ${tag} "${text}" visible=${visible}`);
      if (visible && text === '数据集') {
        console.log(`  -> Clicking this one!`);
        await allDs[i].click();
        await page.waitForTimeout(3000);
        break;
      }
    }
  }
  
  await page.screenshot({ path: '/tmp/after_click_dataset.png', fullPage: true });
  
  // 查看是否有创建数据集的表单
  const pageContent = await page.evaluate(() => document.body.innerText.substring(0, 1500));
  console.log('\nCurrent page content:\n', pageContent);
  
  writeFileSync('/tmp/biz_apis2.json', JSON.stringify(bizAPIs, null, 2));
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
