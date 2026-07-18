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
  const keyword = searchParams.get("keyword") || "";
  const status = searchParams.get("status") || "";
  const category = searchParams.get("category") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;
  if (category) where.category = category;
  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { partner: { name: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.payable.count({ where }),
    prisma.payable.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { dueDate: "asc" },
      include: {
        partner: { select: { id: true, name: true } },
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
  const {
    partnerId, category, title, amount, currency = "CNY",
    exchangeRate, fiscalYear, fiscalMonth, dueDate, remark,
  } = body;

  if (!category) return NextResponse.json({ error: "请选择应付类别" }, { status: 400 });
  if (!title || !title.trim()) return NextResponse.json({ error: "请输入标题" }, { status: 400 });
  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "请输入有效金额" }, { status: 400 });
  }

  if (partnerId) {
    const partner = await prisma.partner.findFirst({ where: { id: parseInt(partnerId), tenantId } });
    if (!partner) return NextResponse.json({ error: "合作方不存在" }, { status: 404 });
  }

  const recDate = dueDate ? new Date(dueDate) : new Date();
  const fy = fiscalYear ? parseInt(fiscalYear) : recDate.getFullYear();
  const fm = fiscalMonth ? parseInt(fiscalMonth) : recDate.getMonth() + 1;
  const baseAmount = exchangeRate ? parseFloat(amount) * parseFloat(exchangeRate) : parseFloat(amount);

  const payable = await prisma.payable.create({
    data: {
      tenantId,
      partnerId: partnerId ? parseInt(partnerId) : null,
      category,
      title,
      amount: parseFloat(amount),
      currency,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1,
      baseAmount,
      paidAmount: 0,
      fiscalYear: fy,
      fiscalMonth: fm,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "UNRECONCILED",
      remark: remark || null,
    },
    include: { partner: { select: { id: true, name: true } } },
  });

  return NextResponse.json(payable, { status: 201 });
}
