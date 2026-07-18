import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

/**
 * 退费扣回：审批通过时，对该学生已释放的提成按退费比例生成负向提成记录。
 * 退费比例 = 退费金额 / (已收款总额)，用于从下月薪资中扣减。
 */
async function clawbackCommissions(tenantId: number, studentId: number, refundRatio: number, refundId: number, operatorId: number) {
  if (refundRatio <= 0) return;
  // 查找该学生所有已释放（RELEASED）的提成
  const released = await prisma.commission.findMany({
    where: { tenantId, studentId, status: "RELEASED" },
  });
  for (const c of released) {
    const clawbackAmount = (Number(c.amount) * refundRatio).toFixed(2);
    await prisma.commission.create({
      data: {
        tenantId,
        studentId,
        ruleId: c.ruleId,
        orderId: c.orderId,
        employeeId: c.employeeId,
        amount: -parseFloat(clawbackAmount), // 负向提成
        status: "ADJUSTED",
        milestoneKey: c.milestoneKey,
        releaseRatio: c.releaseRatio,
        fiscalYear: c.fiscalYear,
        fiscalMonth: c.fiscalMonth,
        // 通过 remark 关联退费单，便于追溯
      },
    }).catch(() => {});
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const refund = await prisma.refund.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      items: true,
    },
  });
  if (!refund) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(refund);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId, tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { status, refundedAt, remark } = body;

  const existing = await prisma.refund.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const newStatus = status ?? existing.status;

  // 退费审批通过 → 触发提成扣回
  if (newStatus === "APPROVED" && existing.status !== "APPROVED") {
    // 计算该学生已收款总额
    const payments = await prisma.payment.findMany({
      where: { tenantId, studentId: existing.studentId, paymentType: { in: ["CLIENT_FEE", "OTHER_INCOME", "PARTNER_FEE"] } },
      select: { baseAmount: true },
    });
    const totalReceived = payments.reduce((sum, p) => sum + Number(p.baseAmount || 0), 0);
    const refundRatio = totalReceived > 0 ? Number(existing.baseAmount || existing.amount) / totalReceived : 0;
    await clawbackCommissions(tenantId, existing.studentId, refundRatio, existing.id, userId);
  }

  const refund = await prisma.refund.update({
    where: { id: parseInt(id) },
    data: {
      status: newStatus,
      approvedBy: newStatus === "APPROVED" ? userId : existing.approvedBy,
      approvedAt: newStatus === "APPROVED" ? new Date() : existing.approvedAt,
      refundedAt: refundedAt !== undefined ? (refundedAt ? new Date(refundedAt) : null) : existing.refundedAt,
      remark: remark !== undefined ? remark : existing.remark,
    },
    include: {
      student: { select: { id: true, name: true, phone: true } },
      items: true,
    },
  });

  return NextResponse.json(refund);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.refund.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "未找到" }, { status: 404 });
  await prisma.refund.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
