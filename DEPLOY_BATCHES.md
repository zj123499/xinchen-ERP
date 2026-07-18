# 新辰ERP 部署批次记录

> 协作约定：本地改代码，攒一批后一次性上传部署。
> 每批完成后在下方追加一条记录，并运行 `deploy_batch.sh "<批次说明>"` 上传到服务器。

## 已部署批次

### 批次 3（2026-07-18）— P9 深度动态 BI 大屏
- 文件：`src/app/api/bi/applications-progress/route.ts`（新增）、`src/app/(main)/bi/screen/page.tsx`（重写）、`src/components/Sidebar.tsx`（加 Monitor 图标 + 数据大屏菜单）
- 改动：
  - 新增 `/api/bi/applications-progress`：返回所有申请的 5 节点进度（材料准备→递交申请→递交签证→到校注册→结案），按 Application.status + Visa.status + Order.status 计算当前节点
  - 大屏 `/bi/screen` 深度动态化：顶部 5 节点进度漏斗（每节点人数+占比条）、左侧「学生申请进度滚动墙」（无缝循环滚动 + 当前节点脉冲动画）、各业务线饼图/月度合同趋势/回款走势/线索来源等 ECharts 动态图表、KPI 数字滚动、实时时钟、自动刷新
- 部署方式：`deploy_batch.js` 打包上传 → `docker compose build --no-cache` → `up`
- 验证：服务器 health=healthy；`/api/bi/applications-progress` 返回 200（15 个申请，节点 [材料准备,递交申请,递交签证,到校注册,结案]）；`/api/dashboard` 返回 200
- 注意：本次首次部署时 `applications-progress/route.ts` 文件内容为空（写入异常）导致 405，已修复重部署；curl 测试登录会 500（body 解析问题），用 node http 直连验证正常，应用本身无碍
- 状态：✅ 已部署，服务器验证通过

### 批次 1（2026-07-18）— P8 AI Agent 三件套增强
- 文件：`prisma/schema.prisma`（新增 `ai_conversations` 表）、`src/app/api/ai/{school-select,writing,customer-service}/route.ts`、`src/app/(main)/ai/{school-select,writing,customer-service}/page.tsx`
- 改动：
  - 新增 `ai_conversations` 表（SCHOOL_SELECT/WRITING/CUSTOMER_SERVICE，关联 studentId/relatedId），固化 AI 产出到业务流
  - 选校顾问：支持 studentId 预填背景 + 保存方案 + 历史查看
  - 文书助手：支持 studentId 预填 + 关联 copywriter_tasks 文书任务 + 回写草稿 + 保存 + 历史
  - 客服助手：多轮上下文 + FAQ 质量匹配（关键词打分）+ 会话保存
- 部署方式：`deploy_batch.js` 打包上传 → `docker compose build --no-cache` → `up`；entrypoint 自动 `prisma db push` 建表
- 验证：服务器 health=200；school-select/writing/customer-service 三个 API 实测可用，`ai_conversations` 表读写正常
- 已知项：容器启动时 `prisma db seed` 报 `Cannot find module 'bcryptjs'`（因 /app/node_modules 无 bcryptjs）。当前数据已播种故不影响线上，但新环境首次部署播种会失败，需后续在 prisma-builder 阶段补装 bcryptjs
- 状态：✅ 已部署，服务器 health=200，功能验证通过

### 批次 0（2026-07-18）— AI 配置界面入口
- 文件：`src/lib/ai-gateway.ts`、`src/app/(main)/settings/configs/page.tsx`
- 改动：AI 网关支持从数据库配置读取 API Key；系统配置页新增「AI 智能配置」分组
- 状态：✅ 已部署，服务器 health=200

---

## 待部署（本地已改，未上传）
（在此追加）
