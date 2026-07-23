/**
 * 顾问列表 API
 * GET /api/advisors                    — 返回 isAssignable=true 角色的用户（通用默认）
 * GET /api/advisors?roleCode=xxx       — 精确指定角色（逗号分隔多角色）
 * GET /api/advisors?roleCode=xxx,yyy   — 指定多个角色
 *
 * 不同场景使用不同方式：
 *   - 线索分配顾问 → /api/advisors（按角色管理中的"可分配"开关控制）
 *   - 文书分配     → /api/advisors?roleCode=document_application（指定文书角色）
 *   - 财务分配     → /api/advisors?roleCode=finance（指定财务角色）
 *
 * 原理：isAssignable 控制"通用顾问"角色，roleCode 用于特定业务场景的精确角色。
 *       两者互不干扰——文书角色的 isAssignable=False，不会出现在通用列表中；
 *       但通过 roleCode=document_application 仍可精确获取。
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
  const { searchParams } = new URL(request.url);
  const roleCodeParam = searchParams.get("roleCode");

  // 如果传了 roleCode，精确匹配指定角色；否则按 isAssignable 过滤
  const where = roleCodeParam
    ? {
        tenantId,
        isActive: true,
        userRoles: {
          some: {
            role: {
              code: { in: roleCodeParam.split(",").map((c) => c.trim()).filter(Boolean) },
            },
          },
        },
      }
    : {
        tenantId,
        isActive: true,
        userRoles: { some: { role: { isAssignable: true } } },
      };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, realName: true, username: true },
    orderBy: { realName: "asc" },
  });

  return NextResponse.json({ list: users });
}
