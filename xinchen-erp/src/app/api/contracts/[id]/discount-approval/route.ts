import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitApproval } from "@/lib/approvalBusiness";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

// POST /api/contracts/[id]/discount-approval  合同优惠审批提交
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, tenantId } = getContext(request);
  const id = parseInt((await params).id);
  const body = await request.json().catch(() => ({}) as any);
  const { discountRate, reason } = body;

  const contract = await prisma.contract.findFirst({ where: { id, tenantId } });
  if (!contract) return NextResponse.json({ error: "合同不存在" }, { status: 404 });

  const rate = Number(discountRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    return NextResponse.json({ error: "优惠比例需在 0~1 之间" }, { status: 400 });
  }

  try {
    const recordId = await submitApproval({
      tenantId,
      applicantId: userId,
      businessType: "CONTRACT_DISCOUNT",
      businessId: id,
      comment: reason ? `优惠比例：${rate}。${reason}` : `优惠比例：${rate}`,
    });
    await prisma.contract.update({
      where: { id },
      data: { discountRate: rate, approvalRecordId: recordId },
    });
    return NextResponse.json({ message: "已提交优惠审批", approvalRecordId: recordId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "提交审批失败" }, { status: 400 });
  }
}
