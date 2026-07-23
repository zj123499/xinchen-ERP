/**
 * 业务线列表 API
 * GET /api/business-lines - 业务线列表（用于产品/合同关联选择）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";;
import { getContext } from "@/lib/context";
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const list = await prisma.businessLine.findMany({
    where: { tenantId },
    select: { id: true, name: true, code: true, status: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ list });
}
