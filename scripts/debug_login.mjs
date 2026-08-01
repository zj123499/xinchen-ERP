import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://111.229.72.128:8082';
const USER = 'admin';
const PASS = 'DataEase@123456';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // 获取页面 HTML 结构
  const html = await page.content();
  writeFileSync('/tmp/login_page.html', html);
  
  // 获取所有 input
  const inputs = await page.locator('input').all();
  console.log(`Found ${inputs.length} inputs`);
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const placeholder = await inputs[i].getAttribute('placeholder');
    const name = await inputs[i].getAttribute('name');
    console.log(`Input ${i}: type=${type}, placeholder=${placeholder}, name=${name}`);
  }
  
  // 获取所有 button
  const buttons = await page.locator('button').all();
  console.log(`\nFound ${buttons.length} buttons`);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    const type = await buttons[i].getAttribute('type');
    const cls = await buttons[i].getAttribute('class');
    console.log(`Button ${i}: text="${text?.trim()}", type=${type}, class=${cls?.substring(0, 60)}`);
  }
  
  await page.screenshot({ path: '/tmp/login_page.png', fullPage: true });
  console.log('\nScreenshot saved to /tmp/login_page.png');
  
  // 尝试填充登录
  if (inputs.length >= 2) {
    await inputs[0].fill(USER);
    await inputs[1].fill(PASS);
    console.log('Filled credentials');
    
    // 找登录按钮 - 尝试所有按钮
    for (let i = 0; i < buttons.length; i++) {
      const text = (await buttons[i].textContent())?.trim();
      if (text && (text.includes('登录') || text.includes('登 录') || text === 'Login' || text === 'Sign in')) {
        console.log(`Clicking button: "${text}"`);
        await buttons[i].click();
        break;
      }
    }
    
    // 如果上面的没找到，尝试回车
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    console.log('After login attempt, URL:', page.url());
    
    // 获取 token
    const token = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        console.log('LS:', key, val?.substring(0, 50));
      }
      return localStorage.getItem('de_v2_user.token') || localStorage.getItem('user.token') || '';
    });
    console.log('Token:', token?.substring(0, 60));
    if (token) {
      writeFileSync('/tmp/dataease_token_raw.txt', token);
    }
  }
  
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
