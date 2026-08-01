#!/bin/bash
# ============================================================
# 新辰ERP - 本地 → 服务器 同步 + Docker Compose 部署
# 适用：macOS / Linux 本机（自带 ssh / scp）
# 用法：
#   chmod +x deploy.sh
#   ./deploy.sh                       # 交互输入密码
#   ./deploy.sh 'Xcwl8888'            # 明文密码
# 推荐（免密）：ssh-copy-id ubuntu@111.229.72.128 后直接 ./deploy.sh
# ============================================================
set -e

SERVER="ubuntu@111.229.72.128"
REMOTE_DIR="/home/ubuntu/xinchen-erp"
LOCAL_DIR="$(cd "$(dirname "$0")/xinchen-erp" && pwd)"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

if [ -n "$1" ]; then
  PW="$1"
  SSH="sshpass -p '$PW' ssh $SSH_OPTS"
  SCP="sshpass -p '$PW' scp $SSH_OPTS"
  RSYNC_SSH="sshpass -p '$PW' ssh $SSH_OPTS"
  USE_SSHPASS=1
else
  SSH="ssh $SSH_OPTS"
  SCP="scp $SSH_OPTS"
  RSYNC_SSH="ssh $SSH_OPTS"
  USE_SSHPASS=0
fi

echo "===== 本地目录: $LOCAL_DIR ====="

echo "===== 1. 清理服务器无关文件 ====="
$SSH $SERVER "cd $REMOTE_DIR 2>/dev/null && \
  rm -rf .next node_modules .env .env.local .env.*.local tsconfig.tsbuildinfo next-env.d.ts .DS_Store 2>/dev/null; \
  find . -maxdepth 1 -name '*.exp' -delete 2>/dev/null; \
  echo '服务器清理完成'" || echo "（首次部署：远端目录尚不存在，将在第2步创建）"

echo "===== 2. 同步本地源码到服务器 ====="
$SSH $SERVER "mkdir -p $REMOTE_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -avz --delete \
    --exclude='.next' --exclude='node_modules' --exclude='.env' \
    --exclude='*.exp' --exclude='.DS_Store' --exclude='tsconfig.tsbuildinfo' \
    --exclude='next-env.d.ts' --exclude='.git' \
    -e "$RSYNC_SSH" \
    "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"
else
  echo "（无 rsync，使用 scp 覆盖同步）"
  $SCP -r "$LOCAL_DIR/." "$SERVER:$REMOTE_DIR/"
fi

echo "===== 3. 服务器内构建并 docker compose 部署 ====="
$SSH $SERVER "cd $REMOTE_DIR && \
  npm install && \
  npm run build && \
  docker rm -f xinchen-erp 2>/dev/null || true; \
  docker compose build --no-cache && \
  docker compose up -d"

echo "===== 4. 健康检查 ====="
$SSH $SERVER "sleep 6; curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3000/api/health || echo '服务启动中...'" || true

echo "✅ 部署完成。访问 http://111.229.72.128:3000"
