/**
 * 申请材料 API
 * GET  /api/application-materials?applicationId=  - 某申请的材料清单
 * POST /api/application-materials                 - 新增材料
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  if (!applicationId) return NextResponse.json({ error: "缺少 applicationId" }, { status: 400 });

  // 租户校验
  const app = await prisma.application.findFirst({ where: { id: parseInt(applicationId), tenantId } });
  if (!app) return NextResponse.json({ error: "申请不存在" }, { status: 404 });

  const list = await prisma.applicationMaterial.findMany({
    where: { applicationId: parseInt(applicationId) },
    orderBy: { id: "asc" },
  });
  return NextResponse.json({ list });
}

export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const body = await request.json();
  const { applicationId, name, type, status, dueDate, fileUrl } = body;

  if (!applicationId || !name || !type) {
    return NextResponse.json({ error: "申请、材料名称、材料类型为必填项" }, { status: 400 });
  }
  const app = await prisma.application.findFirst({ where: { id: parseInt(applicationId), tenantId } });
  if (!app) return NextResponse.json({ error: "申请不存在" }, { status: 404 });

  const material = await prisma.applicationMaterial.create({
    data: {
      applicationId: parseInt(applicationId),
      name, type,
      status: status || "pending",
      dueDate: dueDate ? new Date(dueDate) : null,
      fileUrl: fileUrl || null,
    },
  });
  return NextResponse.json(material, { status: 201 });
}
