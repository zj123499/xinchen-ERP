import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";
import { ROLE_DEPARTMENT_MAP } from "@/lib/menus";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
    roles: (request.headers.get("x-user-roles") || "").split(",").filter(Boolean),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId, userId, roles } = getContext(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: any = { tenantId };
  // 管理员看全部，普通员工只看自己
  const isMgmt = roles.some(r => ROLE_DEPARTMENT_MAP[r]?.isManagement);
  if (!isMgmt) where.userId = userId;

  const [total, list] = await Promise.all([
    prisma.workRecord.count({ where }),
    prisma.workRecord.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: { recordedAt: "desc" },
      include: { user: { select: { id: true, realName: true, username: true } } },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
  const { tenantId, userId, roles } = getContext(request);
  const body = await request.json();

  // 查找所属部门
  let department = "未知";
  for (const role of roles) {
    const info = ROLE_DEPARTMENT_MAP[role];
    if (info) { department = info.dept; break; }
  }

  const record = await prisma.workRecord.create({
    data: {
      tenantId, userId: body.userId || userId, department,
      recordType: body.recordType, description: body.description,
      quantity: body.quantity || 1, amount: body.amount || 0,
      relatedId: body.relatedId, relatedType: body.relatedType,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
