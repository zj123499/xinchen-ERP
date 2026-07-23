import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return { tenantId: parseInt(request.headers.get("x-tenant-id") || "0") };
}

// GET /api/partners/[id]/commissions  渠道商佣金明细列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  const partnerId = parseInt((await params).id);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
  const month = searchParams.get("month") || "";

  const where: Record<string, unknown> = { tenantId, partnerId };
  if (month) where.month = month;

  const [total, list] = await Promise.all([
    prisma.partnerCommission.count({ where }),
    prisma.partnerCommission.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { student: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}
