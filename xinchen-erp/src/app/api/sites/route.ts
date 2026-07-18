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
  const status = searchParams.get("status") || "";
  const keyword = searchParams.get("keyword") || "";

  const where: any = { tenantId };
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { domain: { contains: keyword } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { id: "desc" },
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
  const { name, domain, status } = body;

  if (!name || !domain) {
    return NextResponse.json({ error: "站点名称和域名为必填项" }, { status: 400 });
  }

  const site = await prisma.site.create({
    data: {
      tenantId,
      name,
      domain,
      status: status || "active",
    },
  });

  return NextResponse.json(site, { status: 201 });
}
