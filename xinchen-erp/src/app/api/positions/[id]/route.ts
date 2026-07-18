/**
 * 岗位管理 API - 单条操作
 * PUT   /api/positions/[id] - 更新岗位
 * DELETE /api/positions/[id] - 删除岗位
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, code, deptId, sort } = body;

  const position = await prisma.position.update({
    where: { id: parseInt(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(deptId !== undefined && { deptId: parseInt(deptId) }),
      ...(sort !== undefined && { sort }),
    },
  });

  return NextResponse.json(position);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.position.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
