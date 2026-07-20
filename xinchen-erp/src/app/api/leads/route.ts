/**
 * 线索管理 API
 * GET  /api/leads      - 线索列表（支持分页、搜索、筛选）
 * POST /api/leads      - 新增线索（含防撞单检测）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/permission";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const denied = await requirePermission(request, "leads:view");
  if (denied) return denied;
  const { tenantId } = getContext(request);
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const keyword = url.searchParams.get("keyword") || "";
  const status = url.searchParams.get("status") || "";
  const source = url.searchParams.get("source") || "";

  const where: Prisma.LeadWhereInput = { tenantId };

  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { phone: { contains: keyword } },
      { wechat: { contains: keyword } },
    ];
  }
  if (status) where.status = status as Prisma.EnumLeadStatusFilter["equals"];
  if (source) where.source = source;

  const [total, list] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, realName: true, username: true } },
        student: { select: { id: true, name: true } },
        _count: { select: { followUps: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
  const denied = await requirePermission(request, "leads:create");
  if (denied) return denied;
  const { tenantId, userId } = getContext(request);
  const body = await request.json();
  const {
    name, phone, wechat, source, sourceDetail, targetCountry, targetDegree,
    budget, remark, extData, assignedToId, createStudent,
  } = body;

  if (!name || !source) {
    return NextResponse.json({ error: "姓名和线索来源为必填项" }, { status: 400 });
  }

  // 手机号非必填；若填写则做防撞单检测
  if (phone) {
    const existing = await prisma.lead.findFirst({
      where: { phone, tenantId },
      include: { assignedTo: { select: { id: true, realName: true } } },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "撞单提示",
          message: `该手机号已被「${existing.assignedTo.realName}」录入，如需认领请发起申诉`,
          conflict: true,
          existingLead: {
            id: existing.id,
            name: existing.name,
            phone: existing.phone,
            status: existing.status,
            assignedTo: existing.assignedTo,
            createdAt: existing.createdAt,
          },
        },
        { status: 409 }
      );
    }
  }

  const targetUserId = assignedToId ? parseInt(assignedToId) : userId;

  // 若选择了分配顾问且勾选"自动建档"，则先创建学生并关联到该顾问
  let studentId: number | undefined;
  if (createStudent && targetUserId) {
    const student = await prisma.student.create({
      data: {
        tenantId,
        name,
        phone: phone || null,
        wechat: wechat || null,
        targetCountry: targetCountry || null,
        targetDegree: targetDegree || null,
        budget: budget ? parseFloat(budget) : null,
        remark: remark || null,
        source: source || null,
        assignedToId: targetUserId,
        currentStatus: "LEAD",
      },
    });
    studentId = student.id;

    // 在归属顾问的跟进列表中新建一条初始跟进记录
    await prisma.followUp.create({
      data: {
        studentId: student.id,
        userId: targetUserId,
        type: "system",
        content: `线索「${name}」新建，已自动为学生建档并分配至顾问跟进列表。来源：${source}`,
        leadId: null,
      },
    }).catch(() => {});
  }

  const lead = await prisma.lead.create({
    data: {
      tenantId,
      name,
      phone: phone || "",
      wechat: wechat || null,
      source,
      sourceDetail: sourceDetail || null,
      targetCountry: targetCountry || null,
      targetDegree: targetDegree || null,
      budget: budget ? parseFloat(budget) : null,
      remark: remark || null,
      extData: extData || null,
      assignedToId: targetUserId,
      studentId,
    },
    include: { assignedTo: { select: { id: true, realName: true, username: true } } },
  });

  // 给被分配人发送通知
  if (targetUserId !== userId) {
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: `新线索分配：${name}`,
        content: `来源：${source}${phone ? `，手机：${phone}` : ""}`,
        type: "task",
        link: `/leads`,
      },
    }).catch(() => {});
  }

  return NextResponse.json(lead, { status: 201 });
}
