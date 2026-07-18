#!/bin/sh
set -e

echo "=== 新辰ERP 容器启动 ==="

# 从 .env 文件加载环境变量（过滤注释和空行）
if [ -f /app/.env ]; then
  echo "从 .env 文件加载环境变量..."
  while IFS= read -r line; do
    case "$line" in
      ""|\#*) continue ;;
    esac
    key="${line%%=*}"
    value="${line#*=}"
    key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    export "$key"="$value"
  done < /app/.env
fi

# 确保 Prisma CLI 可解析（NODE_PATH 包含 /app/node_modules）
export NODE_PATH="${NODE_PATH:-/app/node_modules}"
export PATH="/app/node_modules/.bin:$PATH"
PRISMA_BIN="${PRISMA_BIN:-/opt/prisma-cli/node_modules/prisma/build/index.js}"

# 等待数据库就绪
echo "等待数据库连接..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if node -e "
    const { Pool } = require('pg');
    const url = process.env.DATABASE_URL;
    if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
    pool.query('SELECT 1').then(() => { pool.end(); process.exit(0); }).catch((err) => { console.error(err.message); process.exit(1); });
  " 2>/dev/null; then
    echo "数据库已就绪"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "  等待中... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo "警告: 数据库连接超时，继续启动服务..."
fi

# 生成 Prisma Client（运行时依赖 .prisma/client）
echo "生成 Prisma Client (使用 $PRISMA_BIN)..."
cd /app
if [ -f "$PRISMA_BIN" ] && node "$PRISMA_BIN" generate 2>&1 | tail -3; then
  echo "Prisma Client 生成完成"
else
  echo "警告: Prisma Client 生成失败，尝试继续"
fi

# 执行数据库迁移（建表，幂等，accept-data-loss 用于新建/变更）
echo "执行数据库迁移 (prisma db push)..."
if [ -f "$PRISMA_BIN" ] && node "$PRISMA_BIN" db push --accept-data-loss 2>&1; then
  echo "数据库迁移成功"
else
  echo "警告: 数据库迁移未完全成功，但继续启动服务"
fi

# 播种初始数据（租户/角色/菜单/权限/管理员/示例用户/字典/部门/配置）
# prisma seed 配置会调用: npx tsx prisma/seed.ts
echo "播种初始数据 (prisma db seed)..."
if [ -f "$PRISMA_BIN" ] && node "$PRISMA_BIN" db seed 2>&1; then
  echo "初始数据播种完成"
else
  echo "警告: 初始数据播种未完全成功（可能已存在），继续启动服务"
fi

echo "=== 启动 Next.js 服务 ==="
cd /app
exec node server.js
