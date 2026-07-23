/**
 * 专业详情 API
 * GET    /api/majors/:id
 * PUT    /api/majors/:id
 * DELETE /api/majors/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const major = await prisma.major.findFirst({
    where: { id: parseInt(id), tenantId },
    include: { institution: { select: { id: true, name: true } } },
  });
  if (!major) return NextResponse.json({ error: "专业不存在" }, { status: 404 });
  return NextResponse.json(major);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, institutionId, category, degreeLevel, duration, language, tuition, entryRequirements, remark } = body;

  const existing = await prisma.major.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "专业不存在" }, { status: 404 });

  const major = await prisma.major.update({
    where: { id: parseInt(id) },
    data: {
      name: name ?? existing.name,
      institutionId: institutionId ? parseInt(institutionId) : existing.institutionId,
      category: category === undefined ? existing.category : category || null,
      degreeLevel: degreeLevel ?? existing.degreeLevel,
      duration: duration === undefined ? existing.duration : duration || null,
      language: language === undefined ? existing.language : language || null,
      tuition: tuition === undefined ? existing.tuition : tuition ? parseFloat(tuition) : null,
      entryRequirements: entryRequirements === undefined ? existing.entryRequirements : entryRequirements,
      remark: remark === undefined ? existing.remark : remark || null,
    },
  });
  return NextResponse.json(major);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  const { id } = await params;
  const existing = await prisma.major.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!existing) return NextResponse.json({ error: "专业不存在" }, { status: 404 });
  await prisma.major.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
