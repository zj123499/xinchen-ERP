import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

const PARTNER_TYPE_MAP: Record<string, string> = {
  SCHOOL: "院校",
  AGENCY: "中介机构",
  LANGUAGE_SCHOOL: "语言学校",
  RENTAL: "租房合作",
  SERVICE: "境外服务",
  OTHER: "其他",
};

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };

  if (type) where.type = type;
  if (status === "active") where.status = true;
  if (status === "inactive") where.status = false;
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { contactName: { contains: keyword } },
      { contactPhone: { contains: keyword } },
      { country: { contains: keyword } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.partner.count({ where }),
    prisma.partner.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
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

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const {
    name, type, country, contactName, contactPhone,
    contactEmail, commissionRate, status = true,
  } = body;

  if (!name) return NextResponse.json({ error: "请输入合作方名称" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "请选择合作方类型" }, { status: 400 });

  const partner = await prisma.partner.create({
    data: {
      tenantId,
      name,
      type,
      country: country || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      commissionRate: commissionRate ? parseFloat(commissionRate) : null,
      status,
    },
  });

  return NextResponse.json(partner, { status: 201 });
}
