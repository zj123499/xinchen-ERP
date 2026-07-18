#!/usr/bin/env node
// 新辰ERP 同步部署脚本（纯 Node + ssh2，支持密码认证）
// 用法:
//   node sync.js            # 清理 + 上传 + 构建 + docker compose 部署
//   SKIP_BUILD=1 node sync.js  # 仅清理 + 上传（不构建）
const ssh = require('ssh2');
const fs = require('fs');
const path = require('path');

const CFG = {
  host: '111.229.72.128', port: 22, username: 'ubuntu', password: 'Xcwl8888', readyTimeout: 20000,
};
const REMOTE = '/home/ubuntu/xinchen-erp';
const LOCAL = path.join(__dirname, 'xinchen-erp');
const SKIP_BUILD = process.env.SKIP_BUILD === '1';

const IGNORE = ['.next','node_modules','.env','.env.local','.env.*.local','*.exp','._*','*.tsbuildinfo','next-env.d.ts','.DS_Store','.git'];
function shouldIgnore(rel) {
  const base = path.basename(rel);
  for (const pat of IGNORE) {
    if (pat.includes('*')) {
      const re = new RegExp('^' + pat.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      if (re.test(base)) return true;
    } else if (base === pat) return true;
  }
  return false;
}
function walk(dir, out) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const rel = path.relative(LOCAL, full);
    if (shouldIgnore(rel)) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push({ rel, full });
  }
  return out;
}
function exec(conn, cmd) {
  return new Promise((res, rej) => {
    conn.exec(cmd, (e, s) => {
      if (e) return rej(e);
      let d = ''; s.on('data', x => d += x); s.stderr.on('data', x => d += x);
      s.on('close', c => res({ code: c, out: d }));
    });
  });
}
function mkdirp(sftp, dir) {
  return new Promise((res) => {
    const parts = dir.split('/').filter(Boolean);
    let cur = '';
    (function next(i) {
      if (i > parts.length) return res();
      cur += '/' + parts[i - 1];
      sftp.mkdir(cur, () => { if (i < parts.length) next(i + 1); else res(); });
    })(1);
  });
}
(async () => {
  const conn = new ssh.Client();
  await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect(CFG); });
  console.log('✅ SSH 已连接');

  console.log('🧹 清理服务器无关文件...');
  const clean = `cd ${REMOTE} && rm -rf .next node_modules .env .env.local ".env.*.local" .env.prisma tsconfig.tsbuildinfo next-env.d.ts src.bak 2>/dev/null; find . -maxdepth 1 -name '*.exp' -delete 2>/dev/null; find . -maxdepth 1 -name '._*' -delete 2>/dev/null; echo CLEANED`;
  console.log((await exec(conn, clean)).out.trim());

  const files = walk(LOCAL, []);
  console.log(`📦 本地待同步文件: ${files.length} 个`);
  const sftp = await new Promise((res, rej) => conn.sftp((e, s) => e ? rej(e) : res(s)));
  let ok = 0;
  for (const f of files) {
    const remote = path.posix.join(REMOTE, f.rel.split(path.sep).join('/'));
    await mkdirp(sftp, path.posix.dirname(remote));
    await new Promise((res) => sftp.fastPut(f.full, remote, () => res()));
    ok++; if (ok % 50 === 0) console.log(`  已上传 ${ok}/${files.length}`);
  }
  console.log(`✅ 上传完成: ${ok} 个`);

  if (SKIP_BUILD) {
    console.log('⏭️  跳过构建（SKIP_BUILD=1）');
  } else {
    console.log('🔨 docker compose 重建并部署（后台执行，避免超时）...');
    // 服务器已存在 .next/standalone（本地构建产物已部署），直接进入 docker compose build
    // 后台脱离会话执行，日志写入 /tmp/dbuild.log
    const trigger = `cd ${REMOTE} && rm -f /tmp/dbuild.log && setsid bash -c 'docker rm -f xinchen-erp 2>/dev/null; docker compose build --no-cache && docker compose up -d && echo BUILD_DONE' > /tmp/dbuild.log 2>&1 < /dev/null & disown; echo TRIGGERED`;
    console.log((await exec(conn, trigger)).out.trim());
    console.log('⏳ 后台构建已触发，使用 check_status.js 查询结果');
  }
  conn.end();
  console.log('🎉 完成');
})().catch(e => { console.error('❌ 失败:', e.message); process.exit(1); });
