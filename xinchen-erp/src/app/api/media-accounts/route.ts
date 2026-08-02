import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { getAccessScope } from "@/lib/menus";


export async function GET(request: NextRequest) {
    const _denied = await requirePermission(request, "media:view");
  if (_denied) return _denied;

const { tenantId, userId, roles } = getServerContext(request);
  const access = getAccessScope(roles, userId);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const platform = searchParams.get("platform") || "";
  const status = searchParams.get("status") || "";
  const keyword = searchParams.get("keyword") || "";

  const where: any = { tenantId };
  if (access.scope === "self") where.operatorId = userId;
  if (platform) where.platform = platform;
  if (status) where.status = status === "true";
  if (keyword) {
    where.OR = [
      { accountName: { contains: keyword } },
      { accountId: { contains: keyword } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.mediaAccount.count({ where }),
    prisma.mediaAccount.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: "desc" },
      include: {
        performances: {
          orderBy: { statDate: "desc" },
          take: 5,
        },
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

const { tenantId, userId } = getServerContext(request);
  const body = await request.json();
  const { platform, accountName, accountId, followers } = body;

  if (!platform || !accountName) {
    return NextResponse.json({ error: "平台和账号名称为必填项" }, { status: 400 });
  }

  const account = await prisma.mediaAccount.create({
    data: {
      tenantId,
      operatorId: userId,
      platform,
      accountName,
      accountId: accountId || null,
      followers: followers ? parseInt(followers) : 0,
      status: true,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
