/**
 * 岗位管理 API
 * GET  /api/positions - 岗位列表（支持按 deptId 筛选）
 * POST /api/positions - 新建岗位
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
  const deptId = url.searchParams.get("deptId");

  const where: any = { tenantId };
  if (deptId) where.deptId = parseInt(deptId);

  const positions = await prisma.position.findMany({
    where,
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { employees: true } },
    },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ list: positions });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { name, code, deptId, sort } = body;

  if (!name || !code || !deptId) {
    return NextResponse.json({ error: "岗位名称、编码和所属部门为必填项" }, { status: 400 });
  }

  const position = await prisma.position.create({
    data: {
      tenantId,
      name,
      code,
      deptId: parseInt(deptId),
      sort: sort || 0,
    },
  });

  return NextResponse.json(position, { status: 201 });
}
