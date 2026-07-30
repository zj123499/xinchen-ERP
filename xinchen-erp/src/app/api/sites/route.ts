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
  const cloudAccount = searchParams.get("cloudAccount") || "";
  const sortBy = searchParams.get("sortBy") || "id";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const where: any = { tenantId };
  if (status) where.status = status;
  if (cloudAccount) where.cloudAccount = cloudAccount;
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { domain: { contains: keyword } },
      { cloudAccount: { contains: keyword } },
    ];
  }

  const orderBy: any = {};
  if (sortBy === "domainExpiresAt") orderBy.domainExpiresAt = sortOrder;
  else if (sortBy === "name") orderBy.name = sortOrder;
  else orderBy.id = sortOrder;

  const [total, list] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: {
        resolvedServer: { select: { id: true, name: true, address: true } },
        template: { select: { id: true, name: true } },
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
  const { name, domain, status, icpCompany, legalRepresentative, domainExpiresAt,
    baiduAnalyticsAccount, cloudAccount, cloudAccountPassword, cloudLoginPhone,
    baiduSearchResourceAccount, resolvedServerId, templateId } = body;

  if (!name || !domain) {
    return NextResponse.json({ error: "站点名称和域名为必填项" }, { status: 400 });
  }

  const site = await prisma.site.create({
    data: {
      tenantId, name, domain, status: status || "active",
      icpCompany: icpCompany || null,
      legalRepresentative: legalRepresentative || null,
      domainExpiresAt: domainExpiresAt ? new Date(domainExpiresAt) : null,
      baiduAnalyticsAccount: baiduAnalyticsAccount || null,
      cloudAccount: cloudAccount || null,
      cloudAccountPassword: cloudAccountPassword || null,
      cloudLoginPhone: cloudLoginPhone || null,
      baiduSearchResourceAccount: baiduSearchResourceAccount || null,
      resolvedServerId: resolvedServerId ? parseInt(resolvedServerId) : null,
      templateId: templateId ? parseInt(templateId) : null,
    },
  });

  return NextResponse.json(site, { status: 201 });
}