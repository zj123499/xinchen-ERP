/**
 * 钉钉 Stream 模式启动脚本
 * 在服务端独立进程中运行，维持与钉钉的长连接
 * 
 * 使用方式: npx tsx scripts/dingtalk-stream.ts
 *          npm run dingtalk:stream
 */

import { initDingtalkStream } from "../src/lib/dingtalk/init";
import { getStreamStatus } from "../src/lib/dingtalk/stream";

console.log("=".repeat(50));
console.log("  新辰ERP - 钉钉 Stream 模式启动");
console.log("=".repeat(50));

// 启动 Stream
initDingtalkStream();

// 定时输出状态
setInterval(() => {
  const status = getStreamStatus();
  console.log(`[状态] 连接: ${status.connected ? "已连接" : "未连接"}, 运行: ${status.running}`);
}, 30000);

// 优雅退出
process.on("SIGINT", () => {
  console.log("\n正在关闭...");
  const { stopStream } = require("../src/lib/dingtalk/stream");
  stopStream();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n正在关闭...");
  const { stopStream } = require("../src/lib/dingtalk/stream");
  stopStream();
  process.exit(0);
});
