/**
 * 顾问列表 API
 * GET /api/advisors — 返回可分配为顾问的用户（拥有销售/顾问相关角色的在职用户）
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 可担任顾问的角色 code
const ADVISOR_ROLES = [
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

  const users = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      userRoles: { some: { role: { code: { in: ADVISOR_ROLES } } } },
    },
    select: { id: true, realName: true, username: true },
    orderBy: { realName: "asc" },
  });

  return NextResponse.json({ list: users });
}
