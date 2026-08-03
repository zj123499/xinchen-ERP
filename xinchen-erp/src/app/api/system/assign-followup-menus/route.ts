export const dynamic = "force-dynamic";
/**
 * 跟进表单菜单权限批量分配
 * POST /api/system/assign-followup-menus
 * - 把 4 个新跟进菜单分配给 ALL 角色（默认全员可见，管理员在权限配置页单独取消）
 * - 隐藏旧 sales_followups 菜单
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

const NEW_MENU_CODES = [
  "sales_followup_pending",
  "sales_followup_interested",
  "sales_followup_signed",
  "sales_followup_uninterested",
];

export async function POST(request: NextRequest) {
  const roles = (request.headers.get("x-user-roles") || "").split(",").filter(Boolean);
  if (!isAdmin(roles)) return NextResponse.json({ error: "仅管理员" }, { status: 403 });

  const newMenus = await prisma.menu.findMany({ where: { code: { in: NEW_MENU_CODES } } });
  if (newMenus.length === 0) {
    return NextResponse.json({ error: "4 个新菜单不存在，请先运行迁移" }, { status: 400 });
  }

  // 获取 ALL 角色
  const allRoles = await prisma.role.findMany({ select: { id: true, code: true } });

  // 分配 4 个新菜单给所有角色
  let added = 0;
  for (const role of allRoles) {
    for (const nm of newMenus) {
      const exists = await prisma.roleMenu.findFirst({ where: { roleId: role.id, menuId: nm.id } });
      if (!exists) {
        await prisma.roleMenu.create({ data: { roleId: role.id, menuId: nm.id } });
        added++;
      }
    }
  }

  // 隐藏旧跟进菜单
  const oldFollowup = await prisma.menu.findUnique({ where: { code: "sales_followups" } });
  if (oldFollowup) {
    await prisma.menu.update({ where: { id: oldFollowup.id }, data: { visible: false } });
  }

  return NextResponse.json({
    success: true,
    affectedRoles: allRoles.length,
    added,
    message: `4 个跟进菜单已默认分配给全部 ${allRoles.length} 个角色（共添加 ${added} 个 RoleMenu）。管理员可在「权限配置」中单独取消不需要的角色。`,
  });
}
