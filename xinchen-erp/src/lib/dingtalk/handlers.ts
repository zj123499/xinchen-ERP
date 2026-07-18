/**
 * 钉钉事件业务处理器
 * 处理钉钉推送的各类事件并同步到本地数据库
 */

import { prisma } from "@/lib/prisma";
import { syncDingtalkOrganization } from "./sync";

const DEFAULT_TENANT_ID = 1;

/**
 * 处理通讯录用户增加事件
 */
export async function handleUserAddOrg(data: Record<string, unknown>): Promise<void> {
  console.log("[DingTalk] 处理用户入职事件:", data);
  const userIds: string[] = Array.isArray(data.userId) ? data.userId as string[] : [data.userId as string];

  for (const userId of userIds) {
    try {
      const bcryptjs = await import("bcryptjs");
      const passwordHash = await bcryptjs.hash(`dingtalk_${userId}`, 12);

      // 创建用户
      const user = await prisma.user.upsert({
        where: { username: userId },
        update: {
          dingtalkUserId: userId,
          realName: (data.name as string) || undefined,
        },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          username: userId,
          passwordHash,
          dingtalkUserId: userId,
          realName: (data.name as string) || undefined,
        },
      });

      // 创建员工档案
      await prisma.employee.upsert({
        where: { userId: user.id },
        update: {
          dingtalkId: userId,
          name: (data.name as string) || user.username,
        },
        create: {
          tenantId: DEFAULT_TENANT_ID,
          userId: user.id,
          dingtalkId: userId,
          name: (data.name as string) || user.username,
          employeeNo: userId,
          status: "active",
        },
      });

      console.log(`[DingTalk] 用户已同步: ${userId}`);
    } catch (err) {
      console.error(`[DingTalk] 同步用户失败 [${userId}]:`, err);
    }
  }
}

/**
 * 处理通讯录用户离职事件
 */
export async function handleUserLeaveOrg(data: Record<string, unknown>): Promise<void> {
  console.log("[DingTalk] 处理用户离职事件:", data);
  const userIds: string[] = Array.isArray(data.userId) ? data.userId as string[] : [data.userId as string];

  for (const userId of userIds) {
    try {
      // 停用用户
      await prisma.user.updateMany({
        where: { dingtalkUserId: userId },
        data: { isActive: false },
      });

      // 更新员工状态
      await prisma.employee.updateMany({
        where: { dingtalkId: userId },
        data: { status: "inactive", leaveDate: new Date() },
      });

      console.log(`[DingTalk] 用户已停用: ${userId}`);
    } catch (err) {
      console.error(`[DingTalk] 停用用户失败 [${userId}]:`, err);
    }
  }
}

/**
 * 处理通讯录用户信息变更事件
 */
export async function handleUserModifyOrg(data: Record<string, unknown>): Promise<void> {
  console.log("[DingTalk] 处理用户信息变更:", data);
  const userIds: string[] = Array.isArray(data.userId) ? data.userId as string[] : [data.userId as string];

  for (const userId of userIds) {
    try {
      await prisma.user.updateMany({
        where: { dingtalkUserId: userId },
        data: {
          realName: data.name ? (data.name as string) : undefined,
        },
      });

      await prisma.employee.updateMany({
        where: { dingtalkId: userId },
        data: {
          name: data.name ? (data.name as string) : undefined,
        },
      });

      console.log(`[DingTalk] 用户信息已更新: ${userId}`);
    } catch (err) {
      console.error(`[DingTalk] 更新用户失败 [${userId}]:`, err);
    }
  }
}

/**
 * 处理部门创建事件
 */
export async function handleDeptCreate(data: Record<string, unknown>): Promise<void> {
  console.log("[DingTalk] 处理部门创建:", data);
  // 直接全量同步保证数据一致性
  try {
    await syncDingtalkOrganization();
    console.log("[DingTalk] 部门变更已同步");
  } catch (err) {
    console.error("[DingTalk] 同步部门失败:", err);
  }
}

/**
 * 处理部门修改事件
 */
export async function handleDeptModify(data: Record<string, unknown>): Promise<void> {
  console.log("[DingTalk] 处理部门修改:", data);
  try {
    await syncDingtalkOrganization();
    console.log("[DingTalk] 部门变更已同步");
  } catch (err) {
    console.error("[DingTalk] 同步部门失败:", err);
  }
}

/**
 * 处理部门删除事件
 */
export async function handleDeptRemove(data: Record<string, unknown>): Promise<void> {
  console.log("[DingTalk] 处理部门删除:", data);
  try {
    await syncDingtalkOrganization();
    console.log("[DingTalk] 部门变更已同步");
  } catch (err) {
    console.error("[DingTalk] 同步部门失败:", err);
  }
}

/**
 * 处理审批任务变化事件
 */
export async function handleBpmsTaskChange(data: Record<string, unknown>): Promise<void> {
  console.log("[DingTalk] 审批任务变化:", data);
  // TODO: 集成到工作流引擎
}

/**
 * 处理审批实例变化事件
 */
export async function handleBpmsInstanceChange(data: Record<string, unknown>): Promise<void> {
  console.log("[DingTalk] 审批实例变化:", data);
  // TODO: 集成到工作流引擎
}
