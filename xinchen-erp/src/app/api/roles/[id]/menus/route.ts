/**
 * 角色菜单权限 API
 * GET  /api/roles/[id]/menus - 获取全部菜单 + 该角色已分配的菜单
 * PUT  /api/roles/[id]/menus - 保存该角色的菜单权限
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

async function authorize(roleId: number, tenantId: number) {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role || role.tenantId !== tenantId) return null;
  return role;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const roleId = parseInt(id);

  const role = await authorize(roleId, tenantId);
  if (!role) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

  const [menus, assigned] = await Promise.all([
    prisma.menu.findMany({ orderBy: [{ sort: "asc" }, { id: "asc" }] }),
    prisma.roleMenu.findMany({ where: { roleId }, select: { menuId: true } }),
  ]);

  return NextResponse.json({
    menus,
    checked: assigned.map((m) => m.menuId),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const roleId = parseInt(id);

  const role = await authorize(roleId, tenantId);
  if (!role) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

  const body = await request.json();
  const menuIds: number[] = Array.isArray(body.menuIds)
    ? body.menuIds
        .map((x: any) => parseInt(x))
        .filter((x: number) => !isNaN(x))
    : [];

  await prisma.$transaction([
    prisma.roleMenu.deleteMany({ where: { roleId } }),
    prisma.roleMenu.createMany({
      data: menuIds.map((menuId) => ({ roleId, menuId })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
