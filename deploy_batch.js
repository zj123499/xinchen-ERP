#!/usr/bin/env node
/**
 * 新辰ERP - 批次部署脚本
 * 用法：node deploy_batch.js "<批次说明>"
 * 动作：本地打包源码(排除 node_modules/.next/.git/.env) -> ssh2 上传 -> 解压覆盖 -> 触发 docker compose build(后台) -> 立即返回
 * 之后用 node check_deploy.js 查进度。
 */
const ssh = require('ssh2');
const fs = require('fs');
const { execSync } = require('child_process');

const CFG = { host: '111.229.72.128', port: 22, username: 'ubuntu', password: 'Xcwl8888', readyTimeout: 30000 };
const REMOTE = '/home/ubuntu/xinchen-erp';
const LOCAL = '/Users/zhaojie/CodeBuddy/20260711220141/xinchen-erp';
const TARBALL = '/tmp/xinchen_src.tar';
const DESC = process.argv[2] || '(无说明)';

function exec(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => { if (e) return rej(e); let d = ''; s.on('data', x => d += x); s.stderr.on('data', x => d += x); s.on('close', c => res({ code: c, out: d })); });
  });
}

(async () => {
  console.log('=== 打包: ' + DESC + ' ===');
  let cmd = `cd "${LOCAL}" && tar -cf "${TARBALL}"`;
  ['node_modules', '.next', '.git', '.env', '.env.local', '.env.*.local', 'tsconfig.tsbuildinfo', 'next-env.d.ts', '.DS_Store', '*.exp'].forEach(e => { cmd += ` --exclude="${e}"`; });
  cmd += ` .`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('打包完成 ' + (fs.statSync(TARBALL).size/1024/1024).toFixed(1) + ' MB');

  const conn = new ssh.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', e => rej(e)); conn.connect(CFG); });
  console.log('SSH ok');

  const sftp = await new Promise((res, rej) => conn.sftp((e, s) => e ? rej(e) : res(s)));
  await new Promise((res, rej) => sftp.fastPut(TARBALL, '/home/ubuntu/xinchen_src.tar', (e) => e ? rej(e) : res()));
  console.log('上传完成');

  await exec(conn, `mkdir -p ${REMOTE} && tar -xf /home/ubuntu/xinchen_src.tar -C ${REMOTE} && echo UNPACK_OK`);
  const t = await exec(conn, `cd ${REMOTE} && rm -f /tmp/dbuild.log && setsid bash -c 'cd ${REMOTE} && docker compose build --no-cache > /tmp/dbuild.log 2>&1 && docker compose up -d >> /tmp/dbuild.log 2>&1 && echo BUILD_DONE >> /tmp/dbuild.log' < /dev/null & disown; echo TRIGGERED`);
  console.log(t.out.trim());
  conn.end();
  console.log('OK 已触发后台重建。运行 node check_deploy.js 查进度。');
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
