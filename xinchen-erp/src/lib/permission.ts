/**
 * 权限工具：从请求头解析登录上下文，并提供接口权限守卫。
 * middleware 已注入 x-user-id / x-tenant-id / x-user-roles（角色 code 逗号分隔）。
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** 超级管理员角色 code，拥有全部权限，跳过一切校验 */
export const ADMIN_ROLE_CODE = "admin";

export interface AuthContext {
  userId: number;
  tenantId: number;
  roles: string[]; // 角色 code 列表
}

/** 模块 view 权限合集（看板/BI 数据过滤用） */
export const VIEW_PERMISSIONS = [
  "leads:view",
  "students:view",
  "contracts:view",
  "payments:view",
  "applications:view",
  "visits:view",
  "reports:view",
] as const;

export type ViewPermission = (typeof VIEW_PERMISSIONS)[number];

export interface ViewPermissionSet {
  leads: boolean;
  students: boolean;
  contracts: boolean;
  payments: boolean;
  applications: boolean;
  visits: boolean;
  reports: boolean;
  /** 是否拥有平台管理权限（settings:manage） */
  settings: boolean;
  /** 原始已拥有的权限 code 集合 */
  granted: Set<string>;
}

export function getAuthContext(request: NextRequest): AuthContext {
  const roleStr = request.headers.get("x-user-roles") || "";
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
    roles: roleStr.split(",").map((r) => r.trim()).filter(Boolean),
  };
}

export function isAdmin(roles: string[]): boolean {
  return roles.includes(ADMIN_ROLE_CODE);
}

/** 当前用户是否拥有某个权限 code */
export async function hasPermission(request: NextRequest, code: string): Promise<boolean> {
  const { roles, tenantId } = getAuthContext(request);
  if (roles.length === 0) return false;
  if (isAdmin(roles)) return true;

  const count = await prisma.rolePermission.count({
    where: {
      permission: { code },
      role: { code: { in: roles }, tenantId },
    },
  });
  return count > 0;
}

/**
 * 批量查询用户各模块的查看权限（一次 SQL 查询）。
 * admin 角色返回全 true。
 * 用于看板/BI API 按权限过滤数据模块。
 */
export async function getViewPermissions(
  tenantId: number,
  roles: string[]
): Promise<ViewPermissionSet> {
  // admin 拥有全部权限
  if (isAdmin(roles)) {
    return {
      leads: true,
      students: true,
      contracts: true,
      payments: true,
      applications: true,
      visits: true,
      reports: true,
      settings: true,
      granted: new Set(VIEW_PERMISSIONS),
    };
  }

  if (roles.length === 0) {
    return {
      leads: false, students: false, contracts: false, payments: false,
      applications: false, visits: false, reports: false, settings: false,
      granted: new Set(),
    };
  }

  // 检查所有 view 权限 + settings:manage
  const codes = [...VIEW_PERMISSIONS, "settings:manage"];
  const rows = await prisma.rolePermission.findMany({
    where: {
      permission: { code: { in: codes } },
      role: { code: { in: roles }, tenantId },
    },
    select: { permission: { select: { code: true } } },
  });

  const granted = new Set(rows.map((r) => r.permission.code));

  return {
    leads: granted.has("leads:view"),
    students: granted.has("students:view"),
    contracts: granted.has("contracts:view"),
    payments: granted.has("payments:view"),
    applications: granted.has("applications:view"),
    visits: granted.has("visits:view"),
    reports: granted.has("reports:view"),
    settings: granted.has("settings:manage"),
    granted,
  };
}

/**
 * 接口权限守卫。命中权限返回 null（放行）；否则返回 403 响应。
 * 用法：
 *   const denied = await requirePermission(request, "leads:create");
 *   if (denied) return denied;
 */
export async function requirePermission(
  request: NextRequest,
  code: string
): Promise<NextResponse | null> {
  const { userId } = getAuthContext(request);
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const ok = await hasPermission(request, code);
  if (!ok) {
    return NextResponse.json(
      { error: "无权限", message: `缺少权限：${code}` },
      { status: 403 }
    );
  }
  return null;
}
