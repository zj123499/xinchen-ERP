/**
 * 部门管理 API - 单条操作
 * PUT   /api/departments/[id] - 更新部门
 * DELETE /api/departments/[id] - 删除部门
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, code, parentId, sort, isActive } = body;

  const dept = await prisma.department.update({
    where: { id: parseInt(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(parentId !== undefined && { parentId: parentId || null }),
      ...(sort !== undefined && { sort }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(dept);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deptId = parseInt(id);

  // 检查是否有子部门
  const children = await prisma.department.findFirst({
    where: { parentId: deptId },
  });
  if (children) {
    return NextResponse.json(
      { error: "该部门下有子部门，无法删除" },
      { status: 400 }
    );
  }

  await prisma.department.delete({ where: { id: deptId } });
  return NextResponse.json({ success: true });
}
