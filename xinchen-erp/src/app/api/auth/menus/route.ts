/**
 * GET /api/auth/menus
 * 返回当前登录用户可见的菜单 code 集合，供侧边栏按角色过滤。
 * 超级管理员返回 isAdmin=true（前端放行全部菜单）。
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isAdmin } from "@/lib/permission";
import { ROLE_DEPARTMENT_MAP } from "@/lib/menus";

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

  const roleMenus = await prisma.roleMenu.findMany({
    where: { role: { code: { in: roles }, tenantId } },
    select: { menu: { select: { code: true, sort: true } } },
    orderBy: { menu: { sort: "asc" } },
  });

  // 去重并按 sort 排序
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const rm of roleMenus) {
    if (!seen.has(rm.menu.code)) { seen.add(rm.menu.code); codes.push(rm.menu.code); }
  }
  return NextResponse.json({ isAdmin: false, codes, roles, department });
}
