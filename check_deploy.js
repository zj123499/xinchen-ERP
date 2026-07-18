#!/usr/bin/env node
/** 轻量检查服务器构建进度与服务健康 */
const ssh = require('ssh2');
const CFG = { host: '111.229.72.128', port: 22, username: 'ubuntu', password: 'Xcwl8888', readyTimeout: 30000 };
function exec(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => { if (e) return rej(e); let d = ''; s.on('data', x => d += x); s.stderr.on('data', x => d += x); s.on('close', c => res({ code: c, out: d })); });
  });
}
(async () => {
  const conn = new ssh.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', e => rej(e)); conn.connect(CFG); });
  const r = await exec(conn, `echo '=== build log tail ==='; tail -n 12 /tmp/dbuild.log 2>/dev/null; echo '=== container ==='; docker ps --filter name=xinchen-erp --format '{{.Status}}' 2>/dev/null; echo '=== health ==='; curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health 2>/dev/null || echo no-response`);
  console.log(r.out);
  conn.end();
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
