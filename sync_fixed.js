#!/usr/bin/env node
const ssh = require('ssh2');
const fs = require('fs');
const path = require('path');
const CFG = { host: '111.229.72.128', port: 22, username: 'ubuntu', password: 'Xcwl8888', readyTimeout: 20000 };
const REMOTE = '/home/ubuntu/xinchen-erp';
const LOCAL = '/Users/zhaojie/CodeBuddy/20260711220141/xinchen-erp';
const OUT = '/Users/zhaojie/CodeBuddy/20260711220141/syncfixed.txt';
fs.writeFileSync(OUT, '');
function log(s){ fs.appendFileSync(OUT, s+'\n'); }
function exec(conn, cmd){ return new Promise((res,rej)=>{ conn.exec(cmd,(e,s)=>{ if(e)return rej(e); let d=''; s.on('data',x=>d+=x); s.stderr.on('data',x=>d+=x); s.on('close',c=>res({code:c,out:d})); }); }); }
(async()=>{
  const conn=new ssh.Client();
  await new Promise((res,rej)=>{ conn.on('ready',res); conn.on('error',e=>rej(e)); conn.connect(CFG); });
  log('SSH ok');
  const sftp=await new Promise((res,rej)=>conn.sftp((e,s)=>e?rej(e):res(s)));
  const f='prisma.config.ts';
  const remote=path.posix.join(REMOTE,f);
  await new Promise((res)=>{ (function mk(cur,parts,i){ if(i>parts.length)return res(); cur+='/'+parts[i-1]; sftp.mkdir(cur,()=>{ if(i<parts.length)mk(cur,parts,i+1);else res(); }); })( '', path.posix.dirname(remote).split('/').filter(Boolean), 1); });
  await new Promise((res)=>sftp.fastPut(path.join(LOCAL,f),remote,()=>res()));
  log('上传: '+f);
  log((await exec(conn,`cd ${REMOTE} && rm -f /tmp/dbuild.log && setsid bash -c 'docker rm -f xinchen-erp 2>/dev/null; docker compose build --no-cache && docker compose up -d && echo BUILD_DONE' > /tmp/dbuild.log 2>&1 < /dev/null & disown; echo TRIGGERED`)).out);
  conn.end();
  log('done');
})().catch(e=>{ log('err '+e.message); });
