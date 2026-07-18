#!/usr/bin/env node
// 后台轮询服务器构建状态，写 /tmp/waitbuild.txt；被 setsid 启动时无 tty
const ssh = require('ssh2');
const fs = require('fs');
const CFG = { host: '111.229.72.128', port: 22, username: 'ubuntu', password: 'Xcwl8888', readyTimeout: 20000 };
const OUT = '/tmp/waitbuild.txt';
fs.writeFileSync(OUT, 'wait started\n');
function log(s) { try { fs.appendFileSync(OUT, s + '\n'); } catch(e){} }
function exec(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => {
      if (e) return rej(e);
      let d = ''; s.on('data', x => d += x); s.stderr.on('data', x => d += x);
      s.on('close', c => res({ code: c, out: d }));
    });
  });
}
(async () => {
  const conn = new ssh.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', e => rej(e)); conn.connect(CFG); });
  for (let i = 0; i < 40; i++) { // 最多 40*15s = 10 分钟
    const r = await exec(conn, 'tail -2 /tmp/dbuild.log 2>/dev/null; echo "==="; docker ps -a --filter name=xinchen-erp --format "{{.Status}}"');
    const out = r.out;
    log(`[${i*15}s] ` + out.replace(/\n/g, ' || '));
    if (out.includes('BUILD_DONE')) { log('BUILD_DONE detected'); break; }
    if (out.includes('(healthy)')) { log('container healthy'); break; }
    await new Promise(r => setTimeout(r, 15000));
  }
  log('--- final logs ---');
  log((await exec(conn, 'docker logs --tail 60 xinchen-erp 2>&1')).out);
  log('--- health ---');
  log((await exec(conn, "curl -s http://localhost:3000/api/health; echo")).out);
  log('--- login ---');
  log((await exec(conn, 'curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"username":"admin","password":"admin123"}\'; echo')).out);
  conn.end();
  log('WAIT_DONE');
})().catch(e => { log('失败: ' + e.message); });
