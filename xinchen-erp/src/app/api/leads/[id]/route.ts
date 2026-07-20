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

  const lead = await prisma.lead.update({
    where: { id: parseInt(id) },
    data: {
      name: body.name !== undefined ? body.name : undefined,
      phone: body.phone !== undefined ? body.phone : undefined,
      wechat: body.wechat !== undefined ? body.wechat : undefined,
      source: body.source !== undefined ? body.source : undefined,
      sourceDetail: body.sourceDetail !== undefined ? body.sourceDetail : undefined,
      status: body.status !== undefined ? body.status : undefined,
      targetCountry: body.targetCountry !== undefined ? body.targetCountry : undefined,
      targetDegree: body.targetDegree !== undefined ? body.targetDegree : undefined,
      budget: body.budget !== undefined ? (body.budget ? parseFloat(body.budget) : null) : undefined,
      remark: body.remark !== undefined ? body.remark : undefined,
      assignedToId: body.assignedToId !== undefined ? parseInt(body.assignedToId) : undefined,
    },
    include: { assignedTo: { select: { id: true, realName: true, username: true } } },
  });

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
