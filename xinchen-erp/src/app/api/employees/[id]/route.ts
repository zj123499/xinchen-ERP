import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const DEFAULT_PASSWORD = "Xc@123456";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const employee = await prisma.employee.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: { select: { id: true, realName: true, username: true } },
      position: { select: { id: true, name: true } },
    },
  });

  if (!employee) return NextResponse.json({ error: "员工不存在" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const {
    name, userId, positionId, gender, phone, email,
    dingtalkId, entryDate, leaveDate, status,
    roleIds, username, password, resetPassword,
  } = body;

  const existing = await prisma.employee.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "员工不存在" }, { status: 404 });

  const employee = await prisma.employee.update({
    where: { id: parseInt(id) },
    data: {
      name: name || existing.name,
      userId: userId !== undefined ? (userId ? parseInt(userId) : null) : existing.userId,
      positionId: positionId !== undefined ? (positionId ? parseInt(positionId) : null) : existing.positionId,
      gender: gender !== undefined ? (gender || null) : existing.gender,
      phone: phone !== undefined ? phone : existing.phone,
      email: email !== undefined ? email : existing.email,
      dingtalkId: dingtalkId !== undefined ? dingtalkId : existing.dingtalkId,
      entryDate: entryDate !== undefined ? (entryDate ? new Date(entryDate) : null) : existing.entryDate,
      leaveDate: leaveDate !== undefined ? (leaveDate ? new Date(leaveDate) : null) : existing.leaveDate,
      status: status || existing.status,
    },
    include: {
      user: {
        select: {
          id: true,
          realName: true,
          username: true,
          userRoles: { include: { role: { select: { id: true, name: true, code: true } } } },
        },
      },
      position: { select: { id: true, name: true } },
    },
  });

  // 重置密码
  if (resetPassword && employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { passwordHash: await hashPassword(password || DEFAULT_PASSWORD), mustChangePassword: true },
    });
  }

  // 创建 / 更新登录账号
  let effectiveUserId = employee.userId;
  if (username && !employee.userId) {
    const existed = await prisma.user.findUnique({ where: { username } });
    if (existed) return NextResponse.json({ error: "登录用户名已存在" }, { status: 400 });
    const newUser = await prisma.user.create({
      data: {
        tenantId,
        username,
        passwordHash: await hashPassword(password || DEFAULT_PASSWORD),
        realName: name || existing.name,
        phone: phone || null,
        mustChangePassword: true,
        isActive: true,
      },
    });
    await prisma.employee.update({ where: { id: parseInt(id) }, data: { userId: newUser.id } });
    effectiveUserId = newUser.id;
  } else if (username && employee.userId) {
    await prisma.user.update({ where: { id: employee.userId }, data: { username } });
  }

  // 同步角色
  if (roleIds !== undefined && effectiveUserId) {
    await prisma.userRole.deleteMany({ where: { userId: effectiveUserId } });
    if (Array.isArray(roleIds) && roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((rid: number) => ({ userId: effectiveUserId!, roleId: rid })),
      });
    }
  }

  const result = await prisma.employee.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      user: {
        select: {
          id: true,
          realName: true,
          username: true,
          userRoles: { include: { role: { select: { id: true, name: true, code: true } } } },
        },
      },
      position: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    ...result,
    roles: result?.user?.userRoles?.map((ur) => ur.role) || [],
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.employee.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "员工不存在" }, { status: 404 });

  await prisma.employee.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
