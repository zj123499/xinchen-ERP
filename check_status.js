#!/usr/bin/env node
const ssh = require('ssh2');
const fs = require('fs');
const CFG = { host: '111.229.72.128', port: 22, username: 'ubuntu', password: 'Xcwl8888', readyTimeout: 20000 };
const OUT = '/Users/zhaojie/CodeBuddy/20260711220141/checkout.txt';
fs.writeFileSync(OUT, '');
function log(s){ fs.appendFileSync(OUT, s+'\n'); }
function exec(conn, cmd){ return new Promise((res,rej)=>{ conn.exec(cmd,(e,s)=>{ if(e)return rej(e); let d=''; s.on('data',x=>d+=x); s.stderr.on('data',x=>d+=x); s.on('close',c=>res({code:c,out:d})); }); }); }
(async()=>{
  const conn=new ssh.Client();
  await new Promise((res,rej)=>{ conn.on('ready',res); conn.on('error',e=>rej(e)); conn.connect(CFG); });
  log('=== 容器状态 ===');
  log((await exec(conn,'docker ps -a --filter name=xinchen-erp --format "{{.Names}} | {{.Status}}"')).out);
  log('=== 容器日志 ===');
  log((await exec(conn,'docker logs --tail 50 xinchen-erp 2>&1')).out);
  log('=== health ===');
  log((await exec(conn,"curl -s http://localhost:3000/api/health; echo")).out);
  log('=== 登录测试 ===');
  log((await exec(conn,'curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"username":"admin","password":"admin123"}\'; echo')).out);
  conn.end();
  log('=== DONE ===');
})().catch(e=>{ log('err '+e.message); });
