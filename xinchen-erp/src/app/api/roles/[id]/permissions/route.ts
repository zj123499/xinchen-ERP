/**
 * 角色接口(API)权限 API
 * GET  /api/roles/[id]/permissions - 获取全部接口权限 + 该角色已分配的权限
 * PUT  /api/roles/[id]/permissions - 保存该角色的接口权限
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

  const [permissions, assigned] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ groupName: "asc" }, { id: "asc" }] }),
    prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    }),
  ]);

  return NextResponse.json({
    permissions,
    checked: assigned.map((p) => p.permissionId),
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
  const permissionIds: number[] = Array.isArray(body.permissionIds)
    ? body.permissionIds
        .map((x: any) => parseInt(x))
        .filter((x: number) => !isNaN(x))
    : [];

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    }),
  ]);

  return NextResponse.json({ success: true });
}
