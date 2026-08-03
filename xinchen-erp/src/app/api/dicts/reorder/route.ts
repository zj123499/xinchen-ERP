export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

export async function POST(request: NextRequest) {
  const _denied = await requirePermission(request, "settings:manage");
  if (_denied) return _denied;

  const tenantId = parseInt(request.headers.get("x-tenant-id") || "0");
  const body = await request.json();
  const { ids }: { ids: number[] } = body;
  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: "请提供ID列表" }, { status: 400 });
  }

  // 批量更新排序（校验 tenantId 防止跨租户篡改）
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.dict.updateMany({ where: { id, tenantId }, data: { sort: index } })
    )
  );

  return NextResponse.json({ success: true });
}
