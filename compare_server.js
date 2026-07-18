// 对比服务器运行的源码与本地源码，输出差异报告
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const HOST = "111.229.72.128";
const USER = "ubuntu";
const PASS = "Xcwl8888";
const REMOTE_BASE = "/home/ubuntu/xinchen-erp";
const PAIRS = [
  { remote: "src", local: path.join(__dirname, "xinchen-erp", "src") },
  { remote: "prisma", local: path.join(__dirname, "xinchen-erp", "prisma") },
];

const conn = new Client();
const out = [];
const log = (s) => { out.push(s); };

function walkLocal(dir, base) {
  const res = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return res; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.join(base, e.name);
    if (e.isDirectory()) res.push(...walkLocal(full, rel));
    else res.push(rel);
  }
  return res;
}

function sftpGet(sftp, remoteFull, localSavePath) {
  return new Promise((resolve, reject) => {
    sftp.fastGet(remoteFull, localSavePath, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

conn.on("ready", () => {
  conn.sftp((err, sftp) => {
    if (err) { log("SFTP ERR " + err.message); finalize(); return; }
    (async () => {
      const tmpRoot = path.join(__dirname, ".server_pull");
      fs.mkdirSync(tmpRoot, { recursive: true });

      for (const pair of PAIRS) {
        const remoteDir = `${REMOTE_BASE}/${pair.remote}`;
        const cmd = `find ${remoteDir} -type f 2>/dev/null`;
        const fileList = await new Promise((resolve) => {
          conn.exec(cmd, (e, stream) => {
            if (e) { log("EXEC ERR " + e.message); resolve([]); return; }
            let buf = "";
            stream.on("data", (d) => (buf += d.toString()));
            stream.stderr.on("data", (d) => (buf += d.toString()));
            stream.on("close", () => resolve(buf.split("\n").map((s) => s.trim()).filter(Boolean)));
          });
        });

        const remoteRelList = fileList
          .filter((f) => f.startsWith(remoteDir + "/"))
          .map((f) => f.slice(remoteDir.length + 1));

        for (const rf of remoteRelList) {
          const saveTo = path.join(tmpRoot, pair.remote, rf);
          fs.mkdirSync(path.dirname(saveTo), { recursive: true });
          try { await sftpGet(sftp, `${remoteDir}/${rf}`, saveTo); }
          catch (e) { log(`下载失败 ${rf}: ${e.message}`); }
        }

        const localFiles = walkLocal(pair.local, pair.remote);
        const localSet = new Set(localFiles);
        const remoteSet = new Set(remoteRelList.map((r) => path.join(pair.remote, r)));
        const isText = (f) => /\.(tsx?|json|css|md|prisma|yml|yaml|sh|config|ts)$/.test(f);

        for (const rf of remoteRelList) {
          const full = path.join(pair.remote, rf);
          if (!localSet.has(full) && isText(full)) log(`[SERVER ONLY] ${full}`);
        }
        for (const lf of localFiles) {
          if (!remoteSet.has(lf) && isText(lf)) log(`[LOCAL ONLY] ${lf}`);
        }
        for (const rf of remoteRelList) {
          const full = path.join(pair.remote, rf);
          if (!localSet.has(full) || !isText(full)) continue;
          const localPath = path.join(pair.local, rf);
          const remotePath = path.join(tmpRoot, pair.remote, rf);
          try {
            const a = fs.readFileSync(localPath, "utf8");
            const b = fs.readFileSync(remotePath, "utf8");
            if (a !== b) {
              const la = a.split("\n").length, lb = b.split("\n").length;
              log(`[DIFF ${la}/${lb}] ${full}`);
            }
          } catch (e) { log(`[READ ERR] ${full}: ${e.message}`); }
        }
        log(`--- 模块 ${pair.remote}: 服务器 ${remoteRelList.length} 文件, 本地 ${localFiles.length} 文件`);
      }
      finalize();
    })();
  });
});

function finalize() {
  const report = out.join("\n") || "(无差异)";
  fs.writeFileSync(path.join(__dirname, "server_diff.txt"), report);
  console.log(report);
  conn.end();
}

conn.on("error", (e) => { log("CONN ERR " + e.message); finalize(); });
conn.connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 20000 });
