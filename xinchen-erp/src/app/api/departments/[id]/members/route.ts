/**
 * 部门成员管理 API
 * GET    /api/departments/[id]/members — 列出部门成员（含员工姓名、工号）
 * POST   /api/departments/[id]/members — 添加员工到部门 { userId: number }
 * DELETE /api/departments/[id]/members — 从部门移除员工 { userId: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permission";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
    roles: (request.headers.get("x-user-roles") || "").split(",").filter(Boolean),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const deptId = parseInt(id);

  const members = await prisma.userDepartment.findMany({
    where: { tenantId, departmentId: deptId },
    include: {
      user: {
        select: {
          id: true, realName: true, username: true,
          employee: { select: { id: true, employeeNo: true, position: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return NextResponse.json({
    list: members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      realName: m.user.realName,
      username: m.user.username,
      employeeNo: m.user.employee?.employeeNo || "-",
      positionName: m.user.employee?.position?.name || "-",
      employeeId: m.user.employee?.id || null,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId, roles } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  if (!isAdmin(roles)) return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });

  const { id } = await params;
  const deptId = parseInt(id);
  const body = await request.json();
  const { userId } = body;

  if (!userId) return NextResponse.json({ error: "userId 不能为空" }, { status: 400 });

  // 防止重复添加
  const existing = await prisma.userDepartment.findFirst({
    where: { tenantId, departmentId: deptId, userId: parseInt(userId) },
  });
  if (existing) {
    return NextResponse.json({ error: "该员工已在该部门中" }, { status: 409 });
  }

  const record = await prisma.userDepartment.create({
    data: { tenantId, departmentId: deptId, userId: parseInt(userId) },
    include: { user: { select: { id: true, realName: true } } },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId, roles } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  if (!isAdmin(roles)) return NextResponse.json({ error: "仅管理员可操作" }, { status: 403 });

  const { id } = await params;
  const deptId = parseInt(id);
  const { searchParams } = new URL(request.url);
  const userId = parseInt(searchParams.get("userId") || "0");

  if (!userId) return NextResponse.json({ error: "userId 不能为空" }, { status: 400 });

  await prisma.userDepartment.deleteMany({
    where: { tenantId, departmentId: deptId, userId },
  });

  return NextResponse.json({ success: true });
}
