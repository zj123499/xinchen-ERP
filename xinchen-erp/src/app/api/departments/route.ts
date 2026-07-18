/**
 * 部门管理 API
 * GET  /api/departments - 部门列表（树形）
 * POST /api/departments - 新建部门
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const departments = await prisma.department.findMany({
    where: { tenantId },
    include: {
      children: true,
      positions: { select: { id: true, name: true } },
      _count: { select: { userDepts: true } },
    },
    orderBy: { sort: "asc" },
  });

  // 构建树形结构
  const map = new Map<number, any>();
  departments.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const tree: any[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node);
    } else {
      tree.push(node);
    }
  });

  return NextResponse.json({ list: tree });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { name, code, parentId, sort } = body;

  if (!name || !code) {
    return NextResponse.json({ error: "部门名称和编码为必填项" }, { status: 400 });
  }

  // 检查编码唯一性
  const existing = await prisma.department.findFirst({
    where: { tenantId, code },
  });
  if (existing) {
    return NextResponse.json({ error: "部门编码已存在" }, { status: 409 });
  }

  const dept = await prisma.department.create({
    data: {
      tenantId,
      name,
      code,
      parentId: parentId || null,
      sort: sort || 0,
    },
  });

  return NextResponse.json(dept, { status: 201 });
}
