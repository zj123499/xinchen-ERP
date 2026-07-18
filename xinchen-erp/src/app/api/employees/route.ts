import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    roleIds,
  } = body;

  if (!name) return NextResponse.json({ error: "请输入员工姓名" }, { status: 400 });

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

  // 如果传了 roleIds 且有关联的 user，同步更新角色
  if (roleIds && Array.isArray(roleIds) && employee.userId) {
    // 先删除旧的角色关联
    await prisma.userRole.deleteMany({ where: { userId: employee.userId } });
    // 创建新的角色关联
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map((rid: number) => ({ userId: employee.userId!, roleId: rid })),
      });
    }
  }

  const result = {
    ...employee,
    roles: employee.user?.userRoles?.map((ur) => ur.role) || [],
  };

  return NextResponse.json(result, { status: 201 });
}
