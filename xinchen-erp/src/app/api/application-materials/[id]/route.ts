import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function PUT(
  request: NextRequest,
  {
 const _denied = await requirePermission(request, "applications:update");
 if (_denied) return _denied;

 params }: { params: Promise<{ id: string }> }
) {
  const { userId, tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { name, type, status, dueDate, fileUrl } = body;

  const existing = await prisma.applicationMaterial.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "材料不存在" }, { status: 404 });

  const updateData: any = {};
  if (name) updateData.name = name;
  if (type) updateData.type = type;
  if (status) {
    updateData.status = status;
    if (status === "verified") {
      updateData.verifiedBy = userId;
      updateData.verifiedAt = new Date();
    }
  }
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (fileUrl !== undefined) updateData.fileUrl = fileUrl || null;

  const material = await prisma.applicationMaterial.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
  return NextResponse.json(material);
}

export async function DELETE(
  request: NextRequest,
  {
 const _denied = await requirePermission(request, "applications:update");
 if (_denied) return _denied;

 params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.applicationMaterial.findFirst({
    where: { id: parseInt(id), application: { tenantId } },
  });
  if (!existing) return NextResponse.json({ error: "材料不存在" }, { status: 404 });

  await prisma.applicationMaterial.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
