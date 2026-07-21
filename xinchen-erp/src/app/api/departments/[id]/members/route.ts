/**
 * 部门成员管理 API（基于 UserDepartment 直接关联）
 * GET    /api/departments/[id]/members — 列出部门成员
 * POST   /api/departments/[id]/members — 添加员工 { userId }
 * DELETE /api/departments/[id]/members — 移除员工 ?userId=
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

  // 通过部门关联的 User 查询（User 有 tenantId，做租户隔离）
  const members = await prisma.userDepartment.findMany({
    where: { deptId, user: { tenantId } },
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
      id: m.id, userId: m.user.id, realName: m.user.realName, username: m.user.username,
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
  const uid = parseInt(body.userId || "0");
  if (!uid) return NextResponse.json({ error: "userId 不能为空" }, { status: 400 });

  // 验证 user 属于当前租户
  const user = await prisma.user.findFirst({ where: { id: uid, tenantId } });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  // 防重复
  const exists = await prisma.userDepartment.findFirst({ where: { userId: uid, deptId } });
  if (exists) return NextResponse.json({ error: "该员工已在该部门中" }, { status: 409 });

  await prisma.userDepartment.create({ data: { userId: uid, deptId } });

  return NextResponse.json({ success: true }, { status: 201 });
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

  await prisma.userDepartment.deleteMany({ where: { userId, deptId } });

  return NextResponse.json({ success: true });
}
