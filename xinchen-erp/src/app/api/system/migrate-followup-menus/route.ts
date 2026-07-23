/**
 * 跟进表单菜单迁移
 * POST /api/system/migrate-followup-menus
 * - 隐藏旧的 "销售管理/跟进记录"
 * - 新增 4 个表单菜单：待跟进/意向客户/已签约客户/无意向客户
 * - 把原 followup 菜单的角色权限复制给 4 个新菜单
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

const NEW_MENUS = [
  { code: "sales_followup_pending", name: "待跟进", path: "/followups/pending", sort: 3 },
  { code: "sales_followup_interested", name: "意向客户", path: "/followups/interested", sort: 4 },
  { code: "sales_followup_signed", name: "已签约客户", path: "/followups/signed", sort: 5 },
  { code: "sales_followup_uninterested", name: "无意向客户", path: "/followups/uninterested", sort: 6 },
];

export async function POST(request: NextRequest) {
  const roles = (request.headers.get("x-user-roles") || "").split(",").filter(Boolean);
  if (!isAdmin(roles)) return NextResponse.json({ error: "仅管理员" }, { status: 403 });

  const sales = await prisma.menu.findUnique({ where: { code: "sales" } });
  if (!sales) return NextResponse.json({ error: "找不到 sales 父菜单" }, { status: 404 });

  // 1. 创建 4 个新菜单
  const newMenuIds: number[] = [];
  for (const m of NEW_MENUS) {
    const menu = await prisma.menu.upsert({
      where: { code: m.code },
      update: { name: m.name, path: m.path, sort: m.sort, parentId: sales.id, visible: true },
      create: { code: m.code, name: m.name, path: m.path, icon: null, sort: m.sort, type: "menu", parentId: sales.id, visible: true },
    });
    newMenuIds.push(menu.id);
  }

  // 2. 找到原"跟进记录"菜单的所有角色映射
  const oldMenu = await prisma.menu.findUnique({ where: { code: "sales_followups" } });
  let copiedRoleCount = 0;
  if (oldMenu) {
    const oldRoleMenus = await prisma.roleMenu.findMany({ where: { menuId: oldMenu.id } });
    // 把拥有原 followup 菜单的所有角色的权限复制到 4 个新菜单
    for (const rm of oldRoleMenus) {
      for (const newMenuId of newMenuIds) {
        const exists = await prisma.roleMenu.findFirst({
          where: { roleId: rm.roleId, menuId: newMenuId },
        });
        if (!exists) {
          await prisma.roleMenu.create({ data: { roleId: rm.roleId, menuId: newMenuId } });
          copiedRoleCount++;
        }
      }
    }
    // 3. 隐藏旧的"跟进记录"菜单
    await prisma.menu.update({ where: { id: oldMenu.id }, data: { visible: false } });
  }

  return NextResponse.json({
    success: true,
    newMenus: NEW_MENUS.map((m) => m.code),
    copiedRoleCount,
    oldMenuHidden: !!oldMenu,
    message: `迁移完成：新增 ${NEW_MENUS.length} 个菜单，复制 ${copiedRoleCount} 个角色权限${oldMenu ? "，已隐藏旧菜单" : ""}`,
  });
}
