/**
 * 合同详情 API
 * GET    /api/contracts/[id] - 合同详情（含学生、订单、业务线）
 * PUT    /api/contracts/[id] - 更新合同
 * DELETE /api/contracts/[id] - 删除合同
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission(request, "contracts:view");
  if (denied) return denied;
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const contract = await prisma.contract.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      student: {
        select: { id: true, name: true, phone: true, wechat: true, currentStatus: true },
      },
      businessLine: { select: { id: true, name: true } },
      orders: {
        select: {
          id: true,
          orderNo: true,
          productName: true,
          amount: true,
          currency: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          assignedTo: { select: { id: true, realName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "合同不存在" }, { status: 404 });
  }

  return NextResponse.json(contract);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission(request, "contracts:update");
  if (denied) return denied;
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.contract.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "合同不存在" }, { status: 404 });
  }

  // 如果修改了合同编号，检查唯一性
  if (body.contractNo && body.contractNo !== existing.contractNo) {
    const dup = await prisma.contract.findUnique({
      where: { contractNo: body.contractNo },
    });
    if (dup) {
      return NextResponse.json({ error: "合同编号已存在" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  // 禁止更换客户（合同与客户绑定后不可修改）
  if (body.contractNo !== undefined) data.contractNo = body.contractNo;
  if (body.businessLineId !== undefined) data.businessLineId = body.businessLineId ? parseInt(body.businessLineId) : null;
  if (body.signDate !== undefined) data.signDate = new Date(body.signDate);
  if (body.totalAmount !== undefined) data.totalAmount = parseFloat(body.totalAmount);
  if (body.currency !== undefined) data.currency = body.currency;
  if (body.status !== undefined) data.status = body.status;
  if (body.content !== undefined) data.content = body.content;
  if (body.attachmentUrl !== undefined) data.attachmentUrl = body.attachmentUrl || null;
  if (body.remark !== undefined) data.remark = body.remark;

  const contract = await prisma.contract.update({
    where: { id: parseInt(id) },
    data,
    include: {
      student: { select: { id: true, name: true, phone: true } },
      businessLine: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(contract);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission(request, "contracts:delete");
  if (denied) return denied;
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.contract.findFirst({
    where: { id: parseInt(id), tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: "合同不存在" }, { status: 404 });
  }

  // 检查是否有关联申请
  const appCount = await prisma.application.count({
    where: { contractId: parseInt(id) },
  });

  if (appCount > 0) {
    return NextResponse.json(
      { error: "该合同下存在申请记录，请先删除相关申请" },
      { status: 400 }
    );
  }

  await prisma.contract.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ message: "删除成功" });
}
