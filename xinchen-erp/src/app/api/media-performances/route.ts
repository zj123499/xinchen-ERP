import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const accountId = searchParams.get("accountId") || "";

  const where: any = {};
  if (accountId) where.accountId = parseInt(accountId);
  // Filter by tenant via account relation
  if (!accountId && tenantId) {
    where.account = { tenantId };
  }

  const [total, list] = await Promise.all([
    prisma.mediaPerformance.count({ where }),
    prisma.mediaPerformance.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { statDate: "desc" },
      include: {
        account: { select: { id: true, accountName: true, platform: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { accountId, statDate, impressions, clicks, leads, followersDelta } = body;

  if (!accountId || !statDate) {
    return NextResponse.json({ error: "账号和统计日期为必填项" }, { status: 400 });
  }

  const performance = await prisma.mediaPerformance.create({
    data: {
      accountId: parseInt(accountId),
      statDate: new Date(statDate),
      impressions: impressions ? parseInt(impressions) : 0,
      clicks: clicks ? parseInt(clicks) : 0,
      leads: leads ? parseInt(leads) : 0,
      followersDelta: followersDelta ? parseInt(followersDelta) : 0,
    },
    include: {
      account: { select: { id: true, accountName: true, platform: true } },
    },
  });

  return NextResponse.json(performance, { status: 201 });
}
