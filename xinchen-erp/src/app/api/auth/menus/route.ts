export const dynamic = "force-dynamic";
/**
 * GET /api/auth/menus
 * 返回当前登录用户可见的菜单 code 集合，供侧边栏按角色过滤。
 * 超级管理员返回 isAdmin=true（前端放行全部菜单）。
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isAdmin } from "@/lib/permission";
import { ROLE_DEPARTMENT_MAP, MENU_PERMISSION_MAP } from "@/lib/menus";

export async function GET(request: NextRequest) {
  const { userId, tenantId, roles } = getAuthContext(request);
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 查找用户所属部门
  let department = "";
  for (const role of roles) {
    const info = ROLE_DEPARTMENT_MAP[role];
    if (info) { department = info.dept; break; }
  }

  if (isAdmin(roles)) {
    return NextResponse.json({ isAdmin: true, codes: [], roles, department: "管理" });
  }

  // 查询用户拥有的所有权限
  const userPermissions = await prisma.rolePermission.findMany({
    where: { role: { code: { in: roles }, tenantId } },
    select: { permission: { select: { code: true } } },
  });
  const permissionSet = new Set(userPermissions.map(p => p.permission.code));

  // 查询角色分配的菜单
  const roleMenus = await prisma.roleMenu.findMany({
    where: { role: { code: { in: roles }, tenantId } },
    select: { menu: { select: { code: true, sort: true } } },
    orderBy: { menu: { sort: "asc" } },
  });

  // 去重 + 权限二次过滤：只保留用户有权限的菜单
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const rm of roleMenus) {
    const code = rm.menu.code;
    if (seen.has(code)) continue;
    seen.add(code);

    // 检查该菜单是否需要特定权限
    const requiredPerms = MENU_PERMISSION_MAP[code];
    if (requiredPerms) {
      // 菜单定义了权限要求 → 必须至少满足一个
      const hasOne = requiredPerms.some(p => permissionSet.has(p));
      if (!hasOne) continue; // 权限不足，跳过这个菜单
    }
    // 无需权限的菜单（如父级分组菜单）展示但不可交互
    codes.push(code);
  }
  return NextResponse.json({ isAdmin: false, codes, roles, department });
}
