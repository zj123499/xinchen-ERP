/**
 * 数据字典 API - 单条操作
 * PUT   /api/dicts/[id] - 更新字典项
 * DELETE /api/dicts/[id] - 删除字典项
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { dictKey, dictValue, sort, isEnabled } = body;

  const dict = await prisma.dict.update({
    where: { id: parseInt(id) },
    data: {
      ...(dictKey !== undefined && { dictKey }),
      ...(dictValue !== undefined && { dictValue }),
      ...(sort !== undefined && { sort }),
      ...(isEnabled !== undefined && { isEnabled }),
    },
  });

  return NextResponse.json(dict);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.dict.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
