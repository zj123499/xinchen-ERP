import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';
const DS_ID = '1273399598202884096';

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

function getJWT() {
  const raw = readFileSync('/tmp/dataease_token_raw.txt', 'utf8');
  const d = JSON.parse(raw);
  return JSON.parse(d.v);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 收集所有 API 调用
  const allAPIs = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/de2api/') && resp.request().method() === 'POST') {
      const path = url.substring(url.indexOf('/de2api/'));
      try {
        const body = await resp.text();
        if (body.length < 8000) {
          allAPIs.push({ path, status: resp.status(), body });
          console.log(`\n=== ${path} ===`);
          console.log(body.substring(0, 500));
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  
  // 直接导航到数据源页面
  await page.goto(BASE + '/#/data/datasource', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // 点击左侧树中的"新辰未来"
  console.log('\n=== Clicking 新辰未来 in tree ===');
  // 使用 API 返回的树结构直接定位
  const xcTreeNode = page.locator('.ed-tree-node__content, .ed-tree-node__label, span').filter({ hasText: /^新辰未来$/ }).first();
  if (await xcTreeNode.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Found tree node, clicking...');
    await xcTreeNode.click();
    await page.waitForTimeout(5000);
  } else {
    console.log('Tree node not found, trying alternative selectors...');
    // 尝试找到整个树
    const treeItems = await page.locator('[class*="tree"] span, [class*="node"] span').all();
    for (const item of treeItems) {
      const text = (await item.textContent().catch(() => ''))?.trim();
      if (text && text.length < 30) console.log(`Tree: "${text}"`);
      if (text === '新辰未来') {
        await item.click();
        await page.waitForTimeout(3000);
        break;
      }
    }
  }
  
  await page.screenshot({ path: '/tmp/xc_selected.png', fullPage: true });
  
  // 查看页面内容
  const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('\nPage content after selecting:\n', pageText);
  
  // 获取 JWT 并通过 API 查询
  const jwt = getJWT();
  console.log('\n=== API Exploration ===');
  
  // 尝试获取表字段 - 使用从 API 日志中找到的模式
  // datasource/tree 返回了数据源树，getTables 获取表列表
  
  // 尝试获取表信息（包含字段）
  const tableApis = [
    { path: '/de2api/datasource/getTable', body: { datasourceId: DS_ID, tableName: 'rebates' } },
    { path: '/de2api/datasource/tableDetail', body: { datasourceId: DS_ID, tableName: 'rebates' } },
    { path: '/de2api/dataset/table/detail', body: { datasourceId: DS_ID, tableName: 'rebates' } },
  ];
  
  for (const api of tableApis) {
    try {
      const resp = await fetch(BASE + api.path, {
        method: 'POST',
        headers: { 'X-DE-TOKEN': jwt, 'Content-Type': 'application/json' },
        body: JSON.stringify(api.body)
      });
      const data = await resp.json();
      if (resp.status === 200 && data.code === 0) {
        console.log(`\n${api.path} SUCCESS!`);
        console.log(JSON.stringify(data).substring(0, 1000));
      } else {
        console.log(`${api.path}: ${resp.status} - ${JSON.stringify(data).substring(0, 150)}`);
      }
    } catch(e) {
      console.log(`${api.path}: Error - ${e.message}`);
    }
  }
  
  writeFileSync('/tmp/all_apis.json', JSON.stringify(allAPIs, null, 2));
  console.log(`\nTotal APIs: ${allAPIs.length}`);
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
