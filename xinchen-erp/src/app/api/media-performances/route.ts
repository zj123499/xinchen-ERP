export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest) {
  const _denied = await requirePermission(request, "media:view");
  if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const accountId = searchParams.get("accountId") || "";

  const where: any = {};
  if (accountId) {
    where.accountId = parseInt(accountId);
  }
  // 如果未指定 accountId，必须通过 tenantId 过滤，防止跨租户泄露
  if (!where.accountId) {
    if (!tenantId) {
      return NextResponse.json({ total: 0, list: [] });
    }
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

const _denied = await requirePermission(request, "media:create");

if (_denied) return _denied;


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
