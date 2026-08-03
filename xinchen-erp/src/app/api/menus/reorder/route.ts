export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

// PUT /api/menus/reorder
// Body: { items: [{ id: number, sort: number }] }
export async function PUT(request: NextRequest) {
  const denied = await requirePermission(request, "settings:manage");
  if (denied) return denied;

  try {
    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "请提供排序数据" }, { status: 400 });
    }

    // Batch update sort orders
    const updates = items.map((item: { id: number; sort: number }) =>
      prisma.menu.update({ where: { id: item.id }, data: { sort: item.sort } })
    );
    await prisma.$transaction(updates);

    return NextResponse.json({ success: true, count: items.length });
  } catch {
    return NextResponse.json({ error: "排序更新失败" }, { status: 500 });
  }
}
