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
  const platform = searchParams.get("platform") || "";
  const status = searchParams.get("status") || "";
  const keyword = searchParams.get("keyword") || "";

  const where: any = { tenantId };
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
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { platform, accountName, accountId, followers } = body;

  if (!platform || !accountName) {
    return NextResponse.json({ error: "平台和账号名称为必填项" }, { status: 400 });
  }

  const account = await prisma.mediaAccount.create({
    data: {
      tenantId,
      platform,
      accountName,
      accountId: accountId || null,
      followers: followers ? parseInt(followers) : 0,
      status: true,
    },
  });

  return NextResponse.json(account, { status: 201 });
}
