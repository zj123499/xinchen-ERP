import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest) {
    const _denied = await requirePermission(request, "partners:view");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
  const keyword = searchParams.get("keyword") || "";
  const country = searchParams.get("country") || "";

  const where: any = { tenantId };
  if (country) where.country = country;
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { contactName: { contains: keyword } },
      { country: { contains: keyword } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.partnerSchool.count({ where }),
    prisma.partnerSchool.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}

export async function POST(request: NextRequest) {
    const _denied = await requirePermission(request, "partners:manage");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const body = await request.json();
  const {
    name, country, city, contactName, contactEmail,
    responsiblePerson, contractUrl,
  } = body;

  if (!name) return NextResponse.json({ error: "请输入学校名称" }, { status: 400 });

  const school = await prisma.partnerSchool.create({
    data: {
      tenantId,
      name,
      country: country || null,
      city: city || null,
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      responsiblePerson: responsiblePerson || null,
      contractUrl: contractUrl || null,
    },
  });

  return NextResponse.json(school, { status: 201 });
}
