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
  
  // 尝试通过 Vue 组件实例来添加表
  console.log('Trying Vue component approach...');
  
  const vueResult = await page.evaluate(() => {
    // 找到 de-dataset-form 的 Vue 实例
    const formEl = document.querySelector('.de-dataset-form');
    if (!formEl) return 'Form not found';
    
    // Vue 3 把实例挂在 __vue_app__ 或 __vueParentComponent
    // 或者通过 element.__vue__
    let vueInstance = formEl.__vue__;
    
    // 尝试获取 Vue app 实例
    if (!vueInstance) {
      // 遍历所有元素找 Vue 实例
      const allEls = document.querySelectorAll('[class*="dataset"]');
      for (const el of allEls) {
        if (el.__vue__) {
          vueInstance = el.__vue__;
          break;
        }
      }
    }
    
    if (vueInstance) {
      const info = {
        hasProxy: !!vueInstance,
        keys: Object.keys(vueInstance).filter(k => !k.startsWith('_') && !k.startsWith('$')),
        setupState: vueInstance.setupState ? Object.keys(vueInstance.setupState) : [],
      };
      return JSON.stringify(info);
    }
    
    // 尝试通过 Vue devtools hook
    const devtools = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
    if (devtools && devtools.apps) {
      const apps = devtools.apps.map(app => ({
        name: app.name,
        version: app.version
      }));
      return JSON.stringify({ devtoolsApps: apps });
    }
    
    // 尝试读取组件数据
    // DataEase v2 使用 Vue 3 + Composition API
    // 可能通过 provide/inject
    return 'No Vue instance found';
  });
  
  console.log('Vue result:', vueResult);
  
  // 另一种方法：查找 list-item_primary 上的事件处理
  // 双击可能触发不同的事件
  const listItem = page.locator('.list-item_primary').first();
  const itemBox = await listItem.boundingBox().catch(() => null);
  console.log('List item box:', itemBox);
  
  // 尝试右键点击看上下文菜单
  if (itemBox) {
    await listItem.click({ button: 'right' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/right_click.png', fullPage: true });
    
    // 查找上下文菜单
    const contextItems = await page.locator('[class*="dropdown"]:visible span, [class*="menu"]:visible span').all();
    console.log('Context menu items:');
    for (const item of contextItems) {
      const text = (await item.textContent().catch(() => ''))?.trim();
      if (text) console.log(`  "${text}"`);
    }
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
