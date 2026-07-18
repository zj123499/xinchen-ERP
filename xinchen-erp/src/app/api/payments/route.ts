import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

function generatePaymentNo() {
  const now = new Date();
  const prefix = `PMT${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const seq = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `${prefix}${seq}`;
}

const PAYMENT_TYPE_MAP: Record<string, string> = {
  CLIENT_FEE: "客户费用",
  SCHOOL_COMMISSION: "学校佣金",
  PARTNER_FEE: "合作方费用",
  OTHER_INCOME: "其他收入",
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: "现金",
  BANK_TRANSFER: "银行转账",
  WECHAT: "微信",
  ALIPAY: "支付宝",
  CREDIT_CARD: "信用卡",
};

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "";
  const paymentType = searchParams.get("paymentType") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

  const where: Record<string, unknown> = { tenantId };

  if (paymentType) where.paymentType = paymentType;
  if (status) where.status = status;

  if (keyword) {
    where.OR = [
      { paymentNo: { contains: keyword } },
      { payerName: { contains: keyword } },
      { student: { name: { contains: keyword } } },
      { student: { phone: { contains: keyword } } },
      { order: { orderNo: { contains: keyword } } },
    ];
  }

  const [total, list] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { id: true, name: true, phone: true } },
        order: { select: { id: true, orderNo: true, productName: true } },
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
  const { userId, tenantId } = getContext(request);
  const body = await request.json();
  const {
    studentId,
    orderId,
    paymentType = "CLIENT_FEE",
    amount,
    currency = "CNY",
    exchangeRate,
    method,
    paidAt,
    payerName,
    remark,
  } = body;

  if (!studentId) return NextResponse.json({ error: "请选择学生" }, { status: 400 });
  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "请输入有效金额" }, { status: 400 });
  }
  if (!method) return NextResponse.json({ error: "请选择收款方式" }, { status: 400 });
  if (!paidAt) return NextResponse.json({ error: "请选择收款日期" }, { status: 400 });

  const student = await prisma.student.findFirst({
    where: { id: parseInt(studentId), tenantId },
  });
  if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

  if (orderId) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(orderId), tenantId },
    });
    if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  const paymentNo = generatePaymentNo();
  const paidDate = new Date(paidAt);
  const baseAmount = exchangeRate ? parseFloat(amount) * parseFloat(exchangeRate) : parseFloat(amount);

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      studentId: parseInt(studentId),
      orderId: orderId ? parseInt(orderId) : null,
      paymentNo,
      paymentType,
      amount: parseFloat(amount),
      currency,
      exchangeRate: exchangeRate ? parseFloat(exchangeRate) : 1,
      baseAmount,
      method,
      paidAt: paidDate,
      fiscalYear: paidDate.getFullYear(),
      fiscalMonth: paidDate.getMonth() + 1,
      payerName: payerName || null,
      remark: remark || null,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, orderNo: true, productName: true } },
    },
  });

  // 给管理员发送收款通知
  const admins = await prisma.userRole.findMany({
    where: { role: { code: "admin" } },
    select: { userId: true },
  });
  const studentName = payment.student?.name || "未知学生";
  await Promise.all(
    admins
      .filter((a) => a.userId !== userId)
      .map((a) =>
        prisma.notification.create({
          data: {
            userId: a.userId,
            title: `新收款登记：${studentName} - ¥${parseFloat(amount).toLocaleString()}`,
            content: `收款编号：${paymentNo}，类型：${paymentType}，方式：${method}`,
            type: "success",
            link: "/payments",
          },
        }).catch(() => {})
      )
  );

  return NextResponse.json(payment, { status: 201 });
}
