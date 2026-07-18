#!/usr/bin/env node
// 单次调用：阻塞轮询最多 ~140s，检测 BUILD_DONE 或 healthy，结果写工作区文件
const ssh = require('ssh2');
const fs = require('fs');
const CFG = { host: '111.229.72.128', port: 22, username: 'ubuntu', password: 'Xcwl8888', readyTimeout: 20000 };
const OUT = '/Users/zhaojie/CodeBuddy/20260711220141/peek.txt';
fs.writeFileSync(OUT, 'polling...\n');
function log(s){ fs.appendFileSync(OUT, s+'\n'); }
function exec(conn, cmd){ return new Promise((res,rej)=>{ conn.exec(cmd,(e,s)=>{ if(e)return rej(e); let d=''; s.on('data',x=>d+=x); s.stderr.on('data',x=>d+=x); s.on('close',c=>res({code:c,out:d})); }); }); }
(async()=>{
  const conn=new ssh.Client();
  await new Promise((res,rej)=>{ conn.on('ready',res); conn.on('error',e=>rej(e)); conn.connect(CFG); });
  for (let i=0;i<9;i++){ // 9*15s = 135s
    const r = await exec(conn,'tail -3 /tmp/dbuild.log 2>/dev/null; echo "==="; docker ps -a --filter name=xinchen-erp --format "{{.Status}}"');
    const o=r.out;
    log(`[${i*15}s] `+o.replace(/\n/g,' | '));
    if(o.includes('BUILD_DONE')){ log('BUILD_DONE'); break; }
    if(o.includes('(healthy)')){ log('healthy'); break; }
    await new Promise(r=>setTimeout(r,15000));
  }
  conn.end();
  log('poll end');
})().catch(e=>{ log('err '+e.message); });
