/**
 * 线索管理 API
 * GET  /api/leads      - 线索列表（支持分页、搜索、筛选；权限隔离：每人只看自己的线索）
 * POST /api/leads      - 新增线索（含防撞单检测、顾问分配、咨询业务类型）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requirePermission, isAdmin } from "@/lib/permission";

function getContext(request: NextRequest) {
  const roles = (request.headers.get("x-user-roles") || "").split(",").filter(Boolean);
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
    roles,
  };
}

export async function GET(request: NextRequest) {
  const denied = await requirePermission(request, "leads:view");
  if (denied) return denied;
  const { tenantId, userId, roles } = getContext(request);
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const keyword = url.searchParams.get("keyword") || "";
  const status = url.searchParams.get("status") || "";
  const source = url.searchParams.get("source") || "";

  const where: Prisma.LeadWhereInput = { tenantId };

  // 权限隔离：非管理员只能看自己负责的线索
  if (!isAdmin(roles)) {
    where.assignedToId = userId;
  }

  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { phone: { contains: keyword } },
      { wechat: { contains: keyword } },
    ];
  }
  if (status) {
    const statusArr = status.split(",").filter(Boolean);
    if (statusArr.length === 1) {
      where.status = statusArr[0] as Prisma.EnumLeadStatusFilter["equals"];
    } else if (statusArr.length > 1) {
      where.status = { in: statusArr as Prisma.EnumLeadStatusFilter["equals"][] };
    }
  }
  if (source) where.source = source;

  const [total, list] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, realName: true, username: true } },
        student: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, domain: true } },
        _count: { select: { followUps: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize), list,
  });
}

export async function POST(request: NextRequest) {
  const denied = await requirePermission(request, "leads:create");
  if (denied) return denied;
  const { tenantId, userId } = getContext(request);
  const body = await request.json();
  const {
    name, phone, wechat, source, sourceDetail, businessType,
    partnerId, siteId,
    targetCountry, targetDegree, budget, remark, extData,
    assignedToId, createStudent,
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
      return NextResponse.json({
        error: "撞单提示",
        message: `该手机号已被「${existing.assignedTo.realName}」录入，如需认领请发起申诉`,
        conflict: true,
        existingLead: {
          id: existing.id, name: existing.name, phone: existing.phone,
          status: existing.status, assignedTo: existing.assignedTo, createdAt: existing.createdAt,
        },
      }, { status: 409 });
    }
  }

  const targetUserId = assignedToId ? parseInt(assignedToId) : userId;

  // 自动建档
  let studentId: number | undefined;
  if (createStudent && targetUserId) {
    const student = await prisma.student.create({
      data: {
        tenantId, name, phone: phone || null, wechat: wechat || null,
        targetCountry: targetCountry || null, targetDegree: targetDegree || null,
        budget: budget ? parseFloat(budget) : null, remark: remark || null,
        source: source || null, assignedToId: targetUserId, currentStatus: "LEAD",
      },
    });
    studentId = student.id;
    await prisma.followUp.create({
      data: {
        studentId: student.id, userId: targetUserId, type: "system",
        content: `线索「${name}」新建，已自动为学生建档并分配至顾问跟进列表。来源：${source}`,
        leadId: null,
      },
    }).catch(() => {});
  }

  const lead = await prisma.lead.create({
    data: {
      tenantId, name, phone: phone || "", wechat: wechat || null,
      source, sourceDetail: sourceDetail || null,
      businessType: businessType || null,
      partnerId: partnerId ? parseInt(partnerId) : null,
      siteId: siteId ? parseInt(siteId) : null,
      targetCountry: targetCountry || null, targetDegree: targetDegree || null,
      budget: budget ? parseFloat(budget) : null,
      remark: remark || null, extData: extData || null,
      assignedToId: targetUserId, studentId,
    },
    include: {
      assignedTo: { select: { id: true, realName: true, username: true } },
      partner: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    },
  });

  // 通知被分配人
  if (targetUserId !== userId) {
    await prisma.notification.create({
      data: {
        userId: targetUserId, title: `新线索分配：${name}`,
        content: `来源：${source}${phone ? `，手机：${phone}` : ""}`,
        type: "task", link: `/leads`,
      },
    }).catch(() => {});
  }

  return NextResponse.json(lead, { status: 201 });
}
