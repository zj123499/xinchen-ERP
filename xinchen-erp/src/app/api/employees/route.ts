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

function generateEmployeeNo() {
  const now = new Date();
  const seq = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `EMP${now.getFullYear()}${seq}`;
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "";
  const status = searchParams.get("status") || "";
  const roleCode = searchParams.get("roleCode") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };

  if (status) where.status = status;
  if (roleCode) {
    where.user = { userRoles: { some: { role: { code: roleCode } } } };
  }
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { employeeNo: { contains: keyword } },
      { phone: { contains: keyword } },
      { email: { contains: keyword } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            realName: true,
            username: true,
            isDefaultPassword: true,
            mustChangePassword: true,
            userRoles: {
              include: {
                role: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
        position: { select: { id: true, name: true } },
      },
    }),
  ]);

  // 转换数据：把 userRoles 展平为 roles 数组
  const formattedList = list.map((emp) => ({
    ...emp,
    roles: emp.user?.userRoles?.map((ur) => ur.role) || [],
  }));

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    list: formattedList,
  });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const {
    name, userId, positionId, gender, phone, email,
    dingtalkId, entryDate, status = "active",
    roleIds, username, password, confirmPassword, mustChangePassword,
  } = body;

  if (!name) return NextResponse.json({ error: "请输入员工姓名" }, { status: 400 });

  // 自定义密码需二次确认一致，避免管理员填错
  if (password && password !== confirmPassword) {
    return NextResponse.json({ error: "两次输入的密码不一致" }, { status: 400 });
  }

  // 登录用户名唯一性由下方自动解析（resolveAccountUsername）保证

  const employeeNo = generateEmployeeNo();

  const employee = await prisma.employee.create({
    data: {
      tenantId,
      userId: userId ? parseInt(userId) : null,
      positionId: positionId ? parseInt(positionId) : null,
      name,
      employeeNo,
      gender: gender || null,
      phone: phone || null,
      email: email || null,
      dingtalkId: dingtalkId || null,
      entryDate: entryDate ? new Date(entryDate) : null,
      status,
    },
  });

  // 员工有手机号（或显式账号）且尚未关联登录账号时，自动建立系统账号
  // 登录账号默认使用手机号（若显式填写登录用户名则以其为准），初始密码默认 Xc@123456，强制改密
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
          realName: name,
          phone: phone || null,
          mustChangePassword: mustChangePassword !== undefined ? mustChangePassword : !password,
          isDefaultPassword: useDefault,
          isActive: status === "active",
        },
      });
      await prisma.employee.update({
        where: { id: employee.id },
        data: { userId: newUser.id },
      });
      effectiveUserId = newUser.id;
    }
  }

  // 如果传了 roleIds 且有关联的 user，同步更新角色
  if (roleIds && Array.isArray(roleIds) && effectiveUserId) {
    await prisma.userRole.deleteMany({ where: { userId: effectiveUserId } });
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((rid: number) => ({ userId: effectiveUserId!, roleId: rid })),
      });
    }
  }

  const result = await prisma.employee.findFirst({
    where: { id: employee.id },
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
  }, { status: 201 });
}
