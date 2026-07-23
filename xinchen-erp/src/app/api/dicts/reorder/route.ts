import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ids }: { ids: number[] } = body;
  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json({ error: "请提供ID列表" }, { status: 400 });
  }

  // 批量更新排序
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.dict.update({ where: { id }, data: { sort: index } })
    )
  );

  return NextResponse.json({ success: true });
}
