import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

const INCOME_TYPE_MAP: Record<string, string> = {
  CLIENT_FEE: "客户服务费",
  SCHOOL_COMMISSION: "学校返佣",
  PARTNER_COMMISSION: "合作方返佣",
  OTHER_INCOME: "其他收入",
};

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "";
  const incomeType = searchParams.get("incomeType") || "";
  const fiscalYear = searchParams.get("fiscalYear") || "";
  const fiscalMonth = searchParams.get("fiscalMonth") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };
  if (incomeType) where.incomeType = incomeType;
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);
  if (fiscalMonth) where.fiscalMonth = parseInt(fiscalMonth);

  if (keyword) {
    where.OR = [
      { invoiceNo: { contains: keyword } },
      { student: { name: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.income.count({ where }),
    prisma.income.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { recognizedAt: "desc" },
      include: {
        student: { select: { id: true, name: true, phone: true } },
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
    studentId, orderId, incomeType, amount, currency = "CNY",
    exchangeRate, recognizedAt, invoiceNo, remark,
  } = body;

  if (!incomeType) return NextResponse.json({ error: "请选择收入类型" }, { status: 400 });
  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "请输入有效金额" }, { status: 400 });
  }
  if (!recognizedAt) return NextResponse.json({ error: "请选择确认时点" }, { status: 400 });

  if (studentId) {
    const student = await prisma.student.findFirst({ where: { id: parseInt(studentId), tenantId } });
    if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });
  }

  const recDate = new Date(recognizedAt);
  const baseAmount = exchangeRate ? parseFloat(amount) * parseFloat(exchangeRate) : parseFloat(amount);

  const income = await prisma.income.create({
    data: {
      tenantId,
      studentId: studentId ? parseInt(studentId) : null,
      orderId: orderId ? parseInt(orderId) : null,
      incomeType,
      amount: parseFloat(amount),
      currency,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1,
      baseAmount,
      fiscalYear: recDate.getFullYear(),
      fiscalMonth: recDate.getMonth() + 1,
      recognizedAt: recDate,
      invoiceNo: invoiceNo || null,
      remark: remark || null,
    },
    include: { student: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(income, { status: 201 });
}
