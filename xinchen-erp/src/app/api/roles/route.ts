/**
 * 角色管理 API
 * GET  /api/roles - 角色列表
 * POST /api/roles - 新建角色
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
  const roles = await prisma.role.findMany({
    where: { tenantId },
    include: {
      _count: { select: { userRoles: true, roleMenus: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ list: roles });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { name, code, description } = body;

  if (!name || !code) {
    return NextResponse.json({ error: "角色名称和编码为必填项" }, { status: 400 });
  }

  const existing = await prisma.role.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: "角色编码已存在" }, { status: 409 });
  }

  const role = await prisma.role.create({
    data: { tenantId, name, code, description: description || null },
  });

  return NextResponse.json(role, { status: 201 });
}
