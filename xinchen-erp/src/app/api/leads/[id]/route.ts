import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permission";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission(request, "leads:view");
  if (denied) return denied;
  const { tenantId } = getContext(request);
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      assignedTo: { select: { id: true, realName: true, username: true } },
      student: { select: { id: true, name: true, phone: true, wechat: true } },
      followUps: {
        include: { user: { select: { id: true, realName: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      transferLogs: { orderBy: { createdAt: "desc" } },
      appeals: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) return NextResponse.json({ error: "线索不存在" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission(request, "leads:update");
  if (denied) return denied;
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.lead.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "线索不存在" }, { status: 404 });

  if (body.phone && body.phone !== existing.phone) {
    const duplicate = await prisma.lead.findFirst({ where: { phone: body.phone, tenantId } });
    if (duplicate) {
      return NextResponse.json({ error: "该手机号已被其他线索使用" }, { status: 409 });
    }
  }

  // 签约时自动创建学生档案和订单（交付管理以此为基础创建申请）
  const isConverting = body.status === "CONVERTED" && existing.status !== "CONVERTED";
  let studentId = existing.studentId;

  if (isConverting && !studentId) {
    const student = await prisma.student.create({
      data: {
        tenantId,
        name: existing.name,
        phone: existing.phone || null,
        wechat: existing.wechat || null,
        targetCountry: existing.targetCountry || null,
        targetDegree: existing.targetDegree || null,
        budget: existing.budget || null,
        source: existing.source,
        assignedToId: existing.assignedToId,
        currentStatus: "LEAD",
      },
    });
    studentId = student.id;

    // 自动创建合同和订单（申请管理需要学生+订单才能创建申请）
    const suffix = Date.now().toString(36);
    const contract = await prisma.contract.create({
      data: {
        tenantId,
        studentId: student.id,
        contractNo: `CT${String(student.id).padStart(4, "0")}_${suffix}`,
        title: `${student.name} - 留学服务合同`,
        totalAmount: existing.budget ? parseFloat(String(existing.budget)) : 0,
        status: "APPROVED",
      },
    }).catch(() => null);

    if (contract) {
      try {
        const orderNo = `SO${new Date().getFullYear()}${String(student.id).padStart(4, "0")}_${Date.now().toString(36)}`;
        await prisma.order.create({
          data: {
            tenantId,
            studentId: student.id,
            contractId: contract.id,
            orderNo,
            productName: "留学申请服务",
            amount: existing.budget ? parseFloat(String(existing.budget)) : 0,
            status: "PENDING",
          },
        });
      } catch (e: any) {
        console.error("签约自动建订单失败:", e?.message);
      }
    }
  }

  // 退回到意向状态时清除文书分配
  const revertData: any = {};
  if (body.status && body.status !== "CONVERTED") {
    revertData.documentAssignedToId = null;
  }

  const lead = await prisma.lead.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name !== undefined ? body.name : undefined,
      phone: body.phone !== undefined ? body.phone : undefined,
      wechat: body.wechat !== undefined ? body.wechat : undefined,
      source: body.source !== undefined ? body.source : undefined,
      sourceDetail: body.sourceDetail !== undefined ? body.sourceDetail : undefined,
      status: body.status !== undefined ? body.status : undefined,
      businessType: body.businessType !== undefined ? body.businessType : undefined,
      partnerId: body.partnerId !== undefined ? (body.partnerId ? parseInt(body.partnerId) : null) : undefined,
      siteId: body.siteId !== undefined ? (body.siteId ? parseInt(body.siteId) : null) : undefined,
      targetCountry: body.targetCountry !== undefined ? body.targetCountry : undefined,
      targetDegree: body.targetDegree !== undefined ? body.targetDegree : undefined,
      budget: body.budget !== undefined ? (body.budget ? parseFloat(body.budget) : null) : undefined,
      remark: body.remark !== undefined ? body.remark : undefined,
      assignedToId: body.assignedToId !== undefined ? parseInt(body.assignedToId) : undefined,
      documentAssignedToId: body.documentAssignedToId !== undefined ? (body.documentAssignedToId ? parseInt(body.documentAssignedToId) : null) : undefined,
      studentId: studentId !== undefined ? studentId : undefined,
      ...revertData,
    },
    include: {
      assignedTo: { select: { id: true, realName: true, username: true } },
      documentAssignedTo: { select: { id: true, realName: true } },
      student: { select: { id: true, name: true } },
    },
  });

  // 签约时创建一条跟进记录
  if (isConverting) {
    await prisma.followUp.create({
      data: {
        studentId: studentId!,
        userId: existing.assignedToId,
        type: "system",
        content: `客户已签约，自动创建学生档案。${studentId ? `学生ID: ${studentId}` : ""}`,
        leadId: existing.id,
      },
    }).catch(() => {});
  }

  return NextResponse.json(lead);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requirePermission(request, "leads:delete");
  if (denied) return denied;
  const { tenantId } = getContext(request);
  const { id } = await params;

  const existing = await prisma.lead.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "线索不存在" }, { status: 404 });

  await prisma.lead.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
