# ============================================
# 新辰ERP - 生产 Dockerfile（容器内构建模式）
# 源码同步到服务器后，docker build 在容器内完成 next build
# ============================================
# ---- 阶段1: 构建应用 ----
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# 复制依赖清单并安装（带重试，失败即中断并暴露真实错误）
COPY package.json package-lock.json ./
RUN for i in 1 2 3; do npm ci --legacy-peer-deps && break || (echo "npm ci attempt $i failed, retrying in 5s..." && sleep 5); done

# 复制源码与配置
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs ./
COPY public ./public
COPY src ./src

# 生成 Prisma Client（next build 可能依赖）
RUN npx prisma generate

# Next.js 构建（standalone 模式）
# 注意：不要用 `| tail` 吞掉错误码，否则 next build 失败会被误判为成功，
# 导致 .next/standalone 缺失、后续步骤报错且容器停留在旧版本。
ENV NEXT_TELEMETRY_DISABLED=1
# Next.js 16 默认使用 Turbopack，但其原生绑定在 Alpine(musl) 上不可用，
# 必须用 Webpack 构建（官方也建议：next build --webpack）
RUN npx next build --webpack

# 将 standalone 子目录内容扁平化到 .next/standalone/ 根下
# next build 会输出 .next/standalone/<project-name>/，需统一路径
RUN cd /app/.next/standalone && \
    SUBDIR=$(ls -d */ | head -1) && \
    echo \"standalone subdir: $SUBDIR\" && \
    if [ -n \"$SUBDIR\" ] && [ \"$SUBDIR\" != \"node_modules/\" ]; then \
      mv \"$SUBDIR\"/* . 2>/dev/null; \
      mv \"$SUBDIR\"/.[!.]* . 2>/dev/null; \
      rm -rf \"$SUBDIR\"; \
    fi && \
    ls -la

# ---- 阶段2: 准备 Prisma CLI + 种子工具 ----
FROM node:22-alpine AS prisma-builder
RUN apk add --no-cache openssl curl
WORKDIR /prisma-cli
RUN echo '{"name":"prisma-cli","version":"1.0.0","private":true}' > package.json && \
    for i in 1 2 3; do \
      npm install prisma@^7.8.0 @prisma/engines@^7.8.0 @prisma/adapter-pg@^7.8.0 pg@^8.22.0 tsx@^4.23.1 dotenv@^16 && break || \
      echo "npm install attempt $i failed, retrying in 5s..." && sleep 5; \
    done

# ---- 阶段3: 运行镜像 ----
FROM node:22-alpine
RUN apk add --no-cache openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 从 builder 阶段复制 standalone 构建产物（已扁平化到 standalone/ 根）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ ./

# 复制静态资源与 public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 复制 Prisma schema、config 与种子脚本
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

# Prisma CLI 放到独立目录，不覆盖 /app/node_modules
COPY --from=prisma-builder /prisma-cli/node_modules /opt/prisma-cli/node_modules

ENV NODE_PATH=/app/node_modules:/opt/prisma-cli/node_modules
ENV PRISMA_BIN=/opt/prisma-cli/node_modules/prisma/build/index.js
ENV PATH=/opt/prisma-cli/node_modules/.bin:$PATH

# 修复符号链接
RUN for link in $(find /app/.next/node_modules -type l 2>/dev/null); do \
      target=$(readlink "$link"); \
      if echo "$target" | grep -q "xinchen-erp/node_modules/"; then \
        module_name=$(echo "$target" | sed 's|.*/node_modules/||'); \
        if [ -d "/app/node_modules/$module_name" ]; then \
          ln -sf "/app/node_modules/$module_name" "$link"; \
        else rm -f "$link"; fi; \
      fi; \
    done

# 环境变量
COPY .env.production ./.env.production
COPY .env.production ./.env
RUN chown nextjs:nodejs /app/.env

# 启动脚本
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
