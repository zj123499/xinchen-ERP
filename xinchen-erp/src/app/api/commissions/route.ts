import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

const COMMISSION_STATUS_MAP: Record<string, string> = {
  PENDING: "待发放",
  RELEASED: "已发放",
  ADJUSTED: "已调整",
  CANCELLED: "已取消",
};

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "";
  const status = searchParams.get("status") || "";
  const employeeId = searchParams.get("employeeId") || "";
  const fiscalYear = searchParams.get("fiscalYear") || "";
  const fiscalMonth = searchParams.get("fiscalMonth") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };

  if (status) where.status = status;
  if (employeeId) where.employeeId = parseInt(employeeId);
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);
  if (fiscalMonth) where.fiscalMonth = parseInt(fiscalMonth);

  if (keyword) {
    where.OR = [
      { student: { name: { contains: keyword } } },
      { student: { phone: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.commission.count({ where }),
    prisma.commission.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, name: true, phone: true } },
        rule: { select: { id: true, name: true, ruleType: true, version: true } },
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
    studentId, ruleId, orderId, employeeId,
    amount, milestoneKey, fiscalYear, fiscalMonth,
  } = body;

  if (!studentId) return NextResponse.json({ error: "请选择学生" }, { status: 400 });
  if (!ruleId) return NextResponse.json({ error: "请选择提成规则" }, { status: 400 });
  if (!employeeId) return NextResponse.json({ error: "请选择员工" }, { status: 400 });
  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "请输入有效金额" }, { status: 400 });
  }

  const student = await prisma.student.findFirst({
    where: { id: parseInt(studentId), tenantId },
  });
  if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

  const rule = await prisma.commissionRule.findFirst({
    where: { id: parseInt(ruleId), tenantId },
  });
  if (!rule) return NextResponse.json({ error: "提成规则不存在" }, { status: 404 });

  const employee = await prisma.employee.findFirst({
    where: { id: parseInt(employeeId), tenantId },
  });
  if (!employee) return NextResponse.json({ error: "员工不存在" }, { status: 404 });

  const now = new Date();
  const commission = await prisma.commission.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      ruleId: parseInt(ruleId),
      orderId: orderId ? parseInt(orderId) : null,
      employeeId: parseInt(employeeId),
      amount: parseFloat(amount),
      status: "PENDING",
      milestoneKey: milestoneKey || null,
      releaseRatio: null,
      fiscalYear: fiscalYear || now.getFullYear(),
      fiscalMonth: fiscalMonth || (now.getMonth() + 1),
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      rule: { select: { id: true, name: true, ruleType: true } },
    },
  });

  return NextResponse.json(commission, { status: 201 });
}
