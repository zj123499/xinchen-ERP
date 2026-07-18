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
  const costType = searchParams.get("costType") || "";
  const fiscalYear = searchParams.get("fiscalYear") || "";
  const fiscalMonth = searchParams.get("fiscalMonth") || "";

  const where: any = { tenantId };
  if (costType) where.costType = costType;
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);
  if (fiscalMonth) where.fiscalMonth = parseInt(fiscalMonth);

  const [total, list] = await Promise.all([
    prisma.cost.count({ where }),
    prisma.cost.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ fiscalYear: "desc" }, { fiscalMonth: "desc" }, { id: "desc" }],
      include: {
        student: { select: { id: true, name: true } },
      },
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
  const { studentId, costType, amount, currency, fiscalYear, fiscalMonth, description, attachmentUrl } = body;

  if (!costType || amount === undefined || !fiscalYear || !fiscalMonth) {
    return NextResponse.json({ error: "成本类型、金额、会计年度、会计月份为必填项" }, { status: 400 });
  }

  const cost = await prisma.cost.create({
    data: {
      tenantId,
      studentId: studentId ? parseInt(studentId) : null,
      costType,
      amount: parseFloat(amount),
      currency: currency || "CNY",
      fiscalYear: parseInt(fiscalYear),
      fiscalMonth: parseInt(fiscalMonth),
      description: description || null,
      attachmentUrl: attachmentUrl || null,
    },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(cost, { status: 201 });
}
