/**
 * 菜单迁移 API（合并入口）
 * POST /api/system/migrate-followup-menus
 * - 将"合同订单"父菜单改为"合同管理"叶子菜单
 * - 隐藏旧的 contracts_list / orders 子菜单
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

export async function POST(request: NextRequest) {
  const roles = (request.headers.get("x-user-roles") || "").split(",").filter(Boolean);
  if (!isAdmin(roles)) return NextResponse.json({ error: "仅管理员" }, { status: 403 });

  // 改 contracts 为顶级叶子菜单
  const menu = await prisma.menu.findUnique({ where: { code: "contracts" } });
  if (menu) {
    await prisma.menu.update({ where: { id: menu.id }, data: { name: "合同管理", path: "/contracts", type: "menu", icon: "contracts" } });
  }

  // 隐藏旧子菜单
  let hidden = 0;
  for (const code of ["contracts_list", "orders", "orders_list"]) {
    const m = await prisma.menu.findUnique({ where: { code } });
    if (m) { await prisma.menu.update({ where: { id: m.id }, data: { visible: false } }); hidden++; }
  }

  return NextResponse.json({ success: true, updated: !!menu, hidden });
}
