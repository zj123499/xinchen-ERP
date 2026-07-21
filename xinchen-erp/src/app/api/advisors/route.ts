/**
 * 顾问列表 API（按角色过滤）
 * GET /api/advisors                         — 返回所有顾问角色用户
 * GET /api/advisors?roleCode=academic_advisor  — 仅返回指定角色
 * GET /api/advisors?roleCode=marketing_specialist,academic_advisor — 逗号分隔多角色
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
  const roleCodeParam = searchParams.get("roleCode");

  let targetRoles = ALL_ADVISOR_ROLES;
  if (roleCodeParam) {
    // 支持逗号分隔多角色
    const codes = roleCodeParam.split(",").map((c) => c.trim()).filter(Boolean);
    if (codes.length > 0) targetRoles = codes;
  }

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
