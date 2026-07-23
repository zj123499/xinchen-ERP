/**
 * 数据字典 API
 * GET  /api/dicts - 字典列表（支持按 groupName 筛选）
 * POST /api/dicts - 新建字典项
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const url = new URL(request.url);
  const groupName = url.searchParams.get("groupName") || "";

  const where: any = { tenantId };
  if (groupName) where.groupName = groupName;

  const dicts = await prisma.dict.findMany({
    where,
    orderBy: [{ groupName: "asc" }, { sort: "asc" }],
  });

  // 按 groupName 分组返回
  const grouped: Record<string, any[]> = {};
  dicts.forEach((d) => {
    if (!grouped[d.groupName]) grouped[d.groupName] = [];
    grouped[d.groupName].push(d);
  });

  return NextResponse.json({ list: dicts, grouped });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { groupName, dictKey, dictValue, sort, isEnabled } = body;

  if (!groupName || !dictKey || !dictValue) {
    return NextResponse.json(
      { error: "字典分组、键和值为必填项" },
      { status: 400 }
    );
  }

  const dict = await prisma.dict.create({
    data: {
      tenantId,
      groupName,
      dictKey,
      dictValue,
      sort: sort || 0,
      isEnabled: isEnabled !== false,
    },
  });

  return NextResponse.json(dict, { status: 201 });
}
