import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { resolveAccountUsername } from "@/lib/employee-account";

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
      user: { select: { id: true, realName: true, username: true, isDefaultPassword: true, mustChangePassword: true } },
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
    roleIds, username, password, confirmPassword, resetPassword, mustChangePassword,
  } = body;

  // 自定义密码需二次确认一致，避免管理员填错
  if (password && password !== confirmPassword) {
    return NextResponse.json({ error: "两次输入的密码不一致" }, { status: 400 });
  }

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
    const useDefault = !password;
    await prisma.user.update({
      where: { id: employee.userId },
      data: {
        passwordHash: await hashPassword(password || DEFAULT_PASSWORD),
        mustChangePassword: mustChangePassword !== undefined ? mustChangePassword : true,
        isDefaultPassword: useDefault,
      },
    });
  }

  // 创建 / 更新登录账号（无账号时自动用手机号建立；默认手机号登录）
  const prevStatus = existing.status;
  const newStatus = status || existing.status;
  let effectiveUserId = employee.userId;
  if (!employee.userId) {
    const effectiveUsername = await resolveAccountUsername(username, phone);
    if (effectiveUsername) {
      const useDefault = !password;
      const newUser = await prisma.user.create({
        data: {
          tenantId,
          username: effectiveUsername,
          passwordHash: await hashPassword(password || DEFAULT_PASSWORD),
          realName: name || existing.name,
          phone: phone || null,
          mustChangePassword: mustChangePassword !== undefined ? mustChangePassword : !password,
          isDefaultPassword: useDefault,
          isActive: newStatus === "active",
        },
      });
      await prisma.employee.update({ where: { id: parseInt(id) }, data: { userId: newUser.id } });
      effectiveUserId = newUser.id;
    }
  } else if (username && employee.userId) {
    const updateData: Record<string, unknown> = { username };
    if (mustChangePassword !== undefined) updateData.mustChangePassword = mustChangePassword;
    if (password) {
      updateData.passwordHash = await hashPassword(password);
      updateData.isDefaultPassword = false;
    }
    await prisma.user.update({ where: { id: employee.userId }, data: updateData });
  }

  // 离职自动取消登录权限；复职自动恢复
  if (effectiveUserId && prevStatus !== newStatus) {
    await prisma.user.update({
      where: { id: effectiveUserId },
      data: { isActive: newStatus === "active" },
    });
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
          isDefaultPassword: true,
          mustChangePassword: true,
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
