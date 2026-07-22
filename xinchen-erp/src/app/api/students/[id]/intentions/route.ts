/**
 * 学生申请意向管理
 * GET  /api/students/[id]/intentions - 列出
 * POST - 新增意向 { country, institution, major, degree, priority, remark }
 * DELETE ?intentId= - 删除
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCtx(r: NextRequest) {
  return {
    userId: parseInt(r.headers.get("x-user-id") || "0"),
    tenantId: parseInt(r.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getCtx(r);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const list = await prisma.studentIntention.findMany({
    where: { tenantId, studentId: parseInt(id) },
    orderBy: { priority: "asc" },
  });
  return NextResponse.json({ list });
}

export async function POST(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId, userId } = getCtx(r);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const b = await r.json();
  const record = await prisma.studentIntention.create({
    data: {
      tenantId, studentId: parseInt(id),
      country: b.country || null, institution: b.institution || null,
      major: b.major || null, degree: b.degree || null,
      priority: b.priority || 0, remark: b.remark || null,
      createdBy: userId,
    },
  });
  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(r: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getCtx(r);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(r.url);
  const intentId = parseInt(searchParams.get("intentId") || "0");
  if (!intentId) return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  await prisma.studentIntention.deleteMany({ where: { id: intentId, tenantId, studentId: parseInt(id) } });
  return NextResponse.json({ success: true });
}
