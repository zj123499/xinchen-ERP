/**
 * 角色管理 API - 单条操作
 * PUT   /api/roles/[id] - 更新角色
 * DELETE /api/roles/[id] - 删除角色
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, description, isSystem, isAssignable } = body;

  const role = await prisma.role.update({
    where: { id: parseInt(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isSystem !== undefined && { isSystem }),
      ...(isAssignable !== undefined && { isAssignable }),
    },
  });

  return NextResponse.json(role);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const roleId = parseInt(id);

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (role?.isSystem) {
    return NextResponse.json(
      { error: "系统内置角色不可删除" },
      { status: 400 }
    );
  }

  await prisma.role.delete({ where: { id: roleId } });
  return NextResponse.json({ success: true });
}
