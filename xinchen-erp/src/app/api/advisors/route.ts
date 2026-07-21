/**
 * 顾问列表 API（按角色过滤）
 * GET /api/advisors                   — 返回所有顾问角色用户
 * GET /api/advisors?roleCode=xx       — 仅返回指定角色的用户
 * 有效角色码：academic_advisor, marketing_specialist, admin, general_manager, operations_director, network_operator, newmedia_manager
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALL_ADVISOR_ROLES = [
  "admin", "general_manager", "operations_director",
  "marketing_specialist", "academic_advisor",
  "network_operator", "newmedia_manager",
];

function getContext(request: NextRequest) {
  return {
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const roleCode = searchParams.get("roleCode");

  // 如果指定了角色码，只查该角色；否则查所有顾问角色
  const targetRoles = roleCode && ALL_ADVISOR_ROLES.includes(roleCode)
    ? [roleCode]
    : ALL_ADVISOR_ROLES;

  const users = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      userRoles: { some: { role: { code: { in: targetRoles } } } },
    },
    select: { id: true, realName: true, username: true },
    orderBy: { realName: "asc" },
  });

  return NextResponse.json({ list: users });
}
