import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

// GET /api/touchpoints  获客触点列表（分页 + 关键字）
export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "10"), 100);
  const keyword = (searchParams.get("keyword") || "").trim();

  const where: Record<string, unknown> = { tenantId };
  if (keyword) {
    where.OR = [
      { source: { contains: keyword } },
      { campaign: { contains: keyword } },
      { medium: { contains: keyword } },
      { student: { name: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.touchpoint.count({ where }),
    prisma.touchpoint.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { occurredAt: "desc" },
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

// POST /api/touchpoints  新建获客触点
export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json().catch(() => ({}) as any);
  const { studentId, channel, source, medium, campaign, occurredAt, touchUrl, remark } = body;

  if (!studentId) return NextResponse.json({ error: "请选择关联学生" }, { status: 400 });
  if (!channel) return NextResponse.json({ error: "请选择渠道" }, { status: 400 });
  if (!source) return NextResponse.json({ error: "请填写来源" }, { status: 400 });

  const touchpoint = await prisma.touchpoint.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      channel,
      source,
      medium: medium || null,
      campaign: campaign || null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      touchUrl: touchUrl || null,
      remark: remark || null,
    },
    include: { student: { select: { id: true, name: true } } },
  });

  return NextResponse.json(touchpoint, { status: 201 });
}
