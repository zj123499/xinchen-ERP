export const dynamic = "force-dynamic";
/**
 * 系统配置 API - 删除
 * DELETE /api/system-configs/[id] - 删除配置
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "settings:manage");
    if (_denied) return _denied;

  const { id } = await params;
  await prisma.systemConfig.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
