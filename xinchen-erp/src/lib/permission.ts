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
