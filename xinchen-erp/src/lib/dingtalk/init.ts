/**
 * 钉钉 Stream 事件监听启动器（独立进程用）
 * 注册所有事件处理器并启动 Stream 连接
 * 
 * 使用方式: 在 scripts/dingtalk-stream.ts 中调用 initDingtalkStream()
 */

import { startStream, on } from "./stream";
import {
  handleUserAddOrg,
  handleUserLeaveOrg,
  handleUserModifyOrg,
  handleDeptCreate,
  handleDeptModify,
  handleDeptRemove,
  handleBpmsTaskChange,
  handleBpmsInstanceChange,
} from "./handlers";

let initialized = false;

/**
 * 初始化钉钉 Stream 监听
 * 注册事件处理器并启动 Websocket 长连接
 */
export function initDingtalkStream(): void {
  if (initialized) return;
  initialized = true;

  console.log("[DingTalk] 注册事件处理器...");

  // 通讯录事件
  on("user_add_org", async (event) => {
    await handleUserAddOrg(event.data);
  });

  on("user_leave_org", async (event) => {
    await handleUserLeaveOrg(event.data);
  });

  on("user_modify_org", async (event) => {
    await handleUserModifyOrg(event.data);
  });

  // 部门事件
  on("org_dept_create", async (event) => {
    await handleDeptCreate(event.data);
  });

  on("org_dept_modify", async (event) => {
    await handleDeptModify(event.data);
  });

  on("org_dept_remove", async (event) => {
    await handleDeptRemove(event.data);
  });

  // 审批事件
  on("bpms_task_change", async (event) => {
    await handleBpmsTaskChange(event.data);
  });

  on("bpms_instance_change", async (event) => {
    await handleBpmsInstanceChange(event.data);
  });

  // 启动 Stream 连接
  startStream();
}
