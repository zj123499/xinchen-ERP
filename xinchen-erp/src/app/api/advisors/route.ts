/**
 * 顾问列表 API（按角色 isAssignable 标志过滤）
 * GET /api/advisors — 返回所有 isAssignable=true 的角色的在职用户
 * 管理员在「角色管理」中设置哪些角色可被分配为顾问，前端无需写死任何代码。
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

  const users = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      userRoles: { some: { role: { isAssignable: true } } },
    },
    select: { id: true, realName: true, username: true },
    orderBy: { realName: "asc" },
  });

  return NextResponse.json({ list: users });
}
