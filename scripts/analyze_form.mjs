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
  
  // 分析 de-dataset-form 内部结构
  const formStructure = await page.evaluate(() => {
    const form = document.querySelector('.de-dataset-form');
    if (!form) return { error: 'form not found' };
    
    // 获取所有直接子元素和重要后代
    const analyze = (el, depth = 0) => {
      if (depth > 4) return null;
      const result = {
        tag: el.tagName,
        class: el.className?.substring?.(0, 80) || '',
        text: el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? el.textContent?.trim()?.substring(0, 40) : '',
        children: []
      };
      
      for (const child of el.children) {
        const childResult = analyze(child, depth + 1);
        if (childResult) result.children.push(childResult);
      }
      
      // 如果只有深层文本，简化
      if (result.children.length === 0 && el.textContent?.trim()) {
        result.text = el.textContent.trim().substring(0, 60);
      }
      
      return result;
    };
    
    // 获取所有 input 元素
    const inputs = Array.from(form.querySelectorAll('input, textarea, .ed-input__inner, .ed-textarea__inner'));
    const inputInfo = inputs.filter(i => {
      const rect = i.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map(i => ({
      tag: i.tagName,
      type: i.getAttribute('type'),
      placeholder: i.getAttribute('placeholder'),
      class: i.className?.substring?.(0, 60),
      value: i.value,
      rect: { x: Math.round(i.getBoundingClientRect().x), y: Math.round(i.getBoundingClientRect().y), w: Math.round(i.getBoundingClientRect().width) }
    }));
    
    return {
      outerHTML: form.outerHTML.substring(0, 3000),
      inputs: inputInfo
    };
  });
  
  console.log('Form HTML (first 3000 chars):');
  console.log(formStructure.outerHTML);
  
  console.log('\nVisible inputs:');
  for (const inp of formStructure.inputs || []) {
    console.log(`  [${inp.tag}] type=${inp.type} placeholder="${inp.placeholder}" value="${inp.value}" at (${inp.rect?.x},${inp.rect?.y}) w=${inp.rect?.w} class="${inp.class}"`);
  }
  
  // 查看"未命名数据集"在哪里
  const titleEls = await page.locator('.de-dataset-form span, .de-dataset-form div, .de-dataset-form h1, .de-dataset-form h2, .de-dataset-form h3, .de-dataset-form h4').filter({ hasText: '未命名数据集' }).all();
  console.log(`\nTitle elements with "未命名数据集": ${titleEls.length}`);
  for (const el of titleEls) {
    const tag = await el.evaluate(e => e.tagName);
    const cls = await el.getAttribute('class').catch(() => '');
    const editable = await el.getAttribute('contenteditable').catch(() => '');
    console.log(`  [${tag}] class="${cls?.substring(0,60)}" contenteditable="${editable}"`);
  }
  
  await page.screenshot({ path: '/tmp/form_analysis.png', fullPage: true });
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
