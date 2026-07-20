/**
 * GET /api/auth/menus
 * 返回当前登录用户可见的菜单 code 集合，供侧边栏按角色过滤。
 * 超级管理员返回 isAdmin=true（前端放行全部菜单）。
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isAdmin } from "@/lib/permission";

export async function GET(request: NextRequest) {
  const { userId, tenantId, roles } = getAuthContext(request);
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (isAdmin(roles)) {
    return NextResponse.json({ isAdmin: true, codes: [] });
  }

  const roleMenus = await prisma.roleMenu.findMany({
    where: { role: { code: { in: roles }, tenantId } },
    select: { menu: { select: { code: true } } },
  });

  const codes = Array.from(new Set(roleMenus.map((rm) => rm.menu.code)));
  return NextResponse.json({ isAdmin: false, codes });
}
