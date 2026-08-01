import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';

const TABLES = [
  { name: 'rebates', label: '返佣记录' },
  { name: 'commission_details', label: '佣金明细' },
  { name: 'employees', label: '员工信息' },
  { name: 'partners', label: '合作伙伴' },
  { name: 'assets', label: '资产管理' },
  { name: 'expenses', label: '费用支出' },
  { name: 'students', label: '学生信息' },
  { name: 'follow_up_records', label: '跟进记录' },
  { name: 'contracts', label: '合同管理' },
  { name: 'payments', label: '付款记录' },
  { name: 'enrollment', label: '报名注册' },
  { name: 'offers', label: '录取通知' },
  { name: 'applications', label: '申请记录' },
  { name: 'visas', label: '签证管理' },
];

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

async function goToDatasetList(page) {
  await page.goto(BASE + '/#/workbranch/index', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  const dataPrepMenu = page.locator('.ed-sub-menu').filter({ hasText: '数据准备' }).first();
  await dataPrepMenu.hover();
  await page.waitForTimeout(1000);
  const datasetPopup = page.locator('.ed-menu--popup .ed-menu-item, .ed-popper .ed-menu-item').filter({ hasText: '数据集' }).first();
  await datasetPopup.click();
  await page.waitForTimeout(3000);
  await page.waitForSelector('.tree-header', { timeout: 8000 });
}

async function createDatasetViaSQL(page, { name, label }) {
  console.log(`\n--- ${label} (${name}) ---`);
  
  // 点击新建数据集
  const icons = page.locator('.tree-header .custom-icon.btn');
  await icons.nth(1).click({ force: true });
  await page.waitForTimeout(3000);
  await page.waitForSelector('.de-dataset-form', { timeout: 5000 });
  
  // 设置名称
  await page.evaluate((n) => {
    document.querySelector('.dataset-name.ellipsis').textContent = n;
  }, label);
  
  // 选择数据源
  await page.locator('.table-list-top .ed-select__input').first().click();
  await page.waitForTimeout(1000);
  await page.locator('.ed-select-dropdown__item, .ed-tree-node__content').filter({ hasText: '新辰未来' }).first().click({ force: true });
  await page.waitForTimeout(2000);
  
  // 点击"自定义SQL"
  const customSql = page.locator('.list-item_primary').filter({ hasText: '自定义SQL' }).first();
  await customSql.click();
  await page.waitForTimeout(2000);
  
  // 应该弹出了 SQL 编辑器
  // 查找 CodeMirror 或 textarea
  await page.screenshot({ path: `/tmp/sql_${name}.png`, fullPage: true });
  
  // 查找 SQL 输入区域 - 可能是 CodeMirror 编辑器
  const sqlEditor = page.locator('.CodeMirror, [class*="sql-editor"], [class*="monaco"], textarea[class*="sql"]').first();
  const editorVisible = await sqlEditor.isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`  SQL editor visible: ${editorVisible}`);
  
  if (editorVisible) {
    // CodeMirror - 需要通过其 API 设置值
    const sql = `SELECT * FROM "${name}"`;
    console.log(`  SQL: ${sql}`);
    
    // 尝试通过 CodeMirror API
    await page.evaluate((sqlText) => {
      // 查找 CodeMirror 实例
      const cmElement = document.querySelector('.CodeMirror');
      if (cmElement && cmElement.CodeMirror) {
        cmElement.CodeMirror.setValue(sqlText);
        return;
      }
      // 查找 textarea
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.value = sqlText;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, sql);
    await page.waitForTimeout(1000);
    
    // 查找"运行"或"预览"按钮
    const runBtn = page.locator('button, span').filter({ hasText: /运行|执行|预览|查询/ }).first();
    if (await runBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await runBtn.click();
      await page.waitForTimeout(3000);
      console.log('  SQL executed');
    }
  }
  
  await page.screenshot({ path: `/tmp/sql_result_${name}.png`, fullPage: true });
  
  // 保存
  const saveBtn = page.locator('button').filter({ hasText: /^保存$/ }).first();
  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(3000);
    
    const msgs = await page.locator('[class*="message"]').all();
    for (const m of msgs) {
      const t = (await m.textContent().catch(() => ''))?.trim();
      if (t) console.log(`  Msg: ${t}`);
    }
    
    if (page.url().includes('dataset-form')) {
      console.log('  Still on form');
    } else {
      console.log('  Saved!');
    }
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
          console.log(`\nAPI: ${path}`);
          console.log(body.substring(0, 500));
        }
      } catch(e) {}
    }
  });
  
  await login(page);
  await page.waitForTimeout(1000);
  
  // 只创建第一个表来测试流程
  await goToDatasetList(page);
  await createDatasetViaSQL(page, TABLES[0]);
  
  await browser.close();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
