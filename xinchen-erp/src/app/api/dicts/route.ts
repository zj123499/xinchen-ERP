/**
 * 数据字典 API
 * GET  /api/dicts - 字典列表（支持按 groupName 筛选）
 * POST /api/dicts - 新建字典项
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

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

  const [dicts, groups] = await Promise.all([
    prisma.dict.findMany({ where, orderBy: [{ groupName: "asc" }, { sort: "asc" }] }),
    prisma.dictGroup.findMany({ where: { tenantId }, orderBy: { sort: "asc" } }),
  ]);

  // 按 groupName 分组
  const grouped: Record<string, any[]> = {};
  // 先确保所有已知分组都存在（即使为空）
  groups.forEach((g) => { grouped[g.name] = []; });
  // 填入实际数据
  dicts.forEach((d) => {
    if (!grouped[d.groupName]) grouped[d.groupName] = [];
    grouped[d.groupName].push(d);
  });

  return NextResponse.json({ list: dicts, grouped, groups });
}

export async function POST(request: NextRequest) {
    const _denied = await requirePermission(request, "settings:manage");
  if (_denied) return _denied;

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

  // 自动创建分组（如果不存在）
  await prisma.dictGroup.upsert({
    where: { tenantId_name: { tenantId, name: groupName } },
    update: {},
    create: { tenantId, name: groupName },
  }).catch(() => {});

  return NextResponse.json(dict, { status: 201 });
}
