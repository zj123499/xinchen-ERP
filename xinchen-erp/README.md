# 新辰ERP (xinchen-erp)

基于 Next.js 16 (standalone) + Prisma + PostgreSQL 的业务管理系统。

## 技术栈
- Next.js 16.2.10（App Router，standalone 输出）
- React 19
- Prisma 7 + PostgreSQL
- JWT 认证（cookie / Bearer）
- Docker Compose 部署

## 目录结构
```
xinchen-erp/
├── Dockerfile              # 预构建模式（本地 build 后打包 standalone 产物）
├── docker-compose.yml      # 生产部署（容器名 xinchen-erp，端口 3000，外部网络 1panel-network）
├── .env.production         # 生产环境变量（数据库连接 / JWT 密钥 / 应用 URL）
├── .env.example            # 环境变量模板
├── .dockerignore           # 构建上下文忽略（排除 .next / node_modules / *.exp / .env）
├── scripts/
│   ├── docker-entrypoint.sh  # 容器启动：加载 .env、等待 DB、db push、启动 server.js
│   └── dingtalk-stream.ts    # 钉钉事件流（可选）
├── prisma/                 # schema + seed
├── src/                    # 应用源码
└── public/
```

## 本地开发
```bash
npm install
cp .env.example .env   # 按需填写 DATABASE_URL / JWT_SECRET 等
npm run dev
```

## 部署（Docker Compose）
部署方式：**仅使用 docker compose**（不使用 `docker run` 单容器模式）。

构建流程（服务器侧）：
1. `npm install` 安装依赖
2. `npm run build` 生成 `.next/standalone` 产物
3. `docker compose build` 基于 `Dockerfile` 打包镜像（复制 standalone + static + prisma + .env.production）
4. `docker compose up -d` 启动容器

### 一键同步 + 部署
项目根目录提供 `deploy.sh`（在**装有 ssh / scp / rsync 的本机**执行）：
```bash
cd <项目根>
./deploy.sh '服务器密码'      # 自动清理服务器无关文件 → 同步源码 → 构建 → 部署
```
脚本会清理服务器上的 `.next` / `node_modules` / `*.exp` / `.env` 等无关文件，
确保本地与服务器保持一致且可 docker compose 部署。

### 手动部署
```bash
# 本机：同步源码到服务器（排除 .next / node_modules / *.exp / .env）
rsync -avz --delete \
  --exclude='.next' --exclude='node_modules' --exclude='.env' \
  --exclude='*.exp' --exclude='.DS_Store' --exclude='tsconfig.tsbuildinfo' \
  xinchen-erp/ ubuntu@111.229.72.128:/home/ubuntu/xinchen-erp/

# 服务器
cd /home/ubuntu/xinchen-erp
npm install && npm run build
docker compose build --no-cache
docker compose up -d
```

## 环境变量
生产环境通过 `.env.production` 注入（含 `DATABASE_URL` / `JWT_SECRET` /
`NEXTAUTH_SECRET` / `NEXTAUTH_URL` / `COOKIE_SECURE`）。

## 常用命令
- `npm run build` 构建
- `npm run db:push` 推送 Prisma schema 到数据库
- `npm run db:seed` 初始化种子数据
