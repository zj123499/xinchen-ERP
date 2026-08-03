export const dynamic = "force-dynamic";
/**
 * 签证管理 API
 * GET  /api/visas - 签证列表
 * POST /api/visas - 新增签证
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { Prisma } from "@prisma/client";


export async function GET(request: NextRequest) {

const _denied = await requirePermission(request, "visas:view");

if (_denied) return _denied;


  const { tenantId } = getServerContext(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const keyword = url.searchParams.get("keyword") || "";
  const status = url.searchParams.get("status") || "";
  const applicationId = url.searchParams.get("applicationId") || "";

  const where: Prisma.VisaWhereInput = { application: { tenantId } };
  if (keyword) {
    where.OR = [
      { visaNumber: { contains: keyword } },
      { application: { student: { name: { contains: keyword } } } },
    ];
  }
  if (status) where.status = status as Prisma.EnumVisaStatusFilter["equals"];
  if (applicationId) where.applicationId = parseInt(applicationId);

  const [total, list] = await Promise.all([
    prisma.visa.count({ where }),
    prisma.visa.findMany({
      where,
      include: {
        application: {
          select: {
            id: true, institutionName: true, majorName: true,
            student: { select: { id: true, name: true, phone: true } },
            contract: { select: { id: true, contractNo: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {

const _denied = await requirePermission(request, "visas:update");

if (_denied) return _denied;


  const { tenantId } = getServerContext(request);
  const body = await request.json();
  const { applicationId, visaType, status, approvedDate, attachmentUrl } = body;
  if (!applicationId || !visaType) {
    return NextResponse.json({ error: "申请和签证类型为必填项" }, { status: 400 });
  }
  const application = await prisma.application.findFirst({ where: { id: parseInt(applicationId), tenantId } });
  if (!application) return NextResponse.json({ error: "申请不存在" }, { status: 404 });

  const visa = await prisma.visa.create({
    data: {
      applicationId: parseInt(applicationId), visaType,
      status: status || "NOT_STARTED",
      approvedDate: approvedDate ? new Date(approvedDate) : null,
      attachmentUrl: attachmentUrl || null,
    },
    include: {
      application: {
        select: { id: true, institutionName: true, majorName: true, student: { select: { id: true, name: true } } },
      },
    },
  });
  return NextResponse.json(visa, { status: 201 });
}
