/**
 * 角色成员管理 API
 * GET  /api/roles/[id]/members - 获取角色下的用户列表
 * POST /api/roles/[id]/members - 添加用户到角色
 * DELETE /api/roles/[id]/members?userId=xxx - 从角色移除用户
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const roleId = parseInt(id);

  const members = await prisma.userRole.findMany({
    where: { roleId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          realName: true,
          phone: true,
          email: true,
          avatar: true,
          isActive: true,
        },
      },
    },
  });

  return NextResponse.json({
    list: members.map((m) => ({ ...m.user, userRoleId: m.id })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const roleId = parseInt(id);
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  // 检查是否已存在
  const existing = await prisma.userRole.findFirst({
    where: { roleId, userId: parseInt(userId) },
  });
  if (existing) {
    return NextResponse.json({ error: "该用户已在此角色中" }, { status: 409 });
  }

  const userRole = await prisma.userRole.create({
    data: { roleId, userId: parseInt(userId) },
  });

  return NextResponse.json(userRole, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const roleId = parseInt(id);
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  await prisma.userRole.deleteMany({
    where: { roleId, userId: parseInt(userId) },
  });

  return NextResponse.json({ success: true });
}
