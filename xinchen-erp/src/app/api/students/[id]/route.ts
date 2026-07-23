import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordOperation } from "@/lib/operation-log";
import { requirePermission } from "@/lib/permission";

function getContext(request: NextRequest) {
  return { tenantId: parseInt(request.headers.get("x-tenant-id") || "0") };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requirePermission(request, "students:view");
    if (denied) return denied;
    const { tenantId } = getContext(request);
    const { id } = await params;

    const student = await prisma.student.findFirst({
      where: { id: parseInt(id), tenantId },
      include: {
        assignedTo: { select: { id: true, realName: true, username: true } },
        leads: {
          include: { assignedTo: { select: { id: true, realName: true } } },
          orderBy: { createdAt: "desc" },
        },
        followUps: {
          include: { user: { select: { id: true, realName: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        contracts: {
          select: {
            id: true,
            contractNo: true,
            signDate: true,
            totalAmount: true,
            currency: true,
            status: true,
            businessLine: { select: { id: true, name: true } },
            orders: { select: { id: true, orderNo: true, productName: true, amount: true, currency: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        applications: {
          include: { offers: true, visas: true },
          orderBy: { createdAt: "desc" },
        },
        orders: {
          include: { contract: { select: { id: true, contractNo: true } } },
          orderBy: { createdAt: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" } },
        lifecycleEvents: { orderBy: { eventDate: "desc" } },
      },
    });

    if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });
    return NextResponse.json(student);
  } catch (error: any) {
    console.error("GET /api/students/[id] error:", error);
    return NextResponse.json({ error: error.message || "服务器错误" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requirePermission(request, "students:update");
    if (denied) return denied;
    const { tenantId } = getContext(request);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.student.findFirst({ where: { id: parseInt(id), tenantId } });
    if (!existing) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

    const student = await prisma.student.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        gender: body.gender !== undefined ? body.gender || null : undefined,
        birthDate: body.birthDate !== undefined ? (body.birthDate ? new Date(body.birthDate) : null) : undefined,
        phone: body.phone !== undefined ? body.phone || null : undefined,
        wechat: body.wechat !== undefined ? body.wechat || null : undefined,
        email: body.email !== undefined ? body.email || null : undefined,
        idNumber: body.idNumber !== undefined ? body.idNumber || null : undefined,
        passportNo: body.passportNo !== undefined ? body.passportNo || null : undefined,
        nationality: body.nationality !== undefined ? body.nationality || null : undefined,
        currentSchool: body.currentSchool !== undefined ? body.currentSchool || null : undefined,
        currentMajor: body.currentMajor !== undefined ? body.currentMajor || null : undefined,
        education: body.education !== undefined ? body.education || null : undefined,
        gpa: body.gpa !== undefined ? (body.gpa !== null && body.gpa !== "" ? parseFloat(body.gpa) : null) : undefined,
        targetCountry: body.targetCountry !== undefined ? body.targetCountry || null : undefined,
        targetDegree: body.targetDegree !== undefined ? body.targetDegree || null : undefined,
        targetMajor: body.targetMajor !== undefined ? body.targetMajor || null : undefined,
        budget: body.budget !== undefined ? (body.budget !== null && body.budget !== "" ? parseFloat(body.budget) : null) : undefined,
        emergencyContact: body.emergencyContact !== undefined ? body.emergencyContact || null : undefined,
        emergencyPhone: body.emergencyPhone !== undefined ? body.emergencyPhone || null : undefined,
        remark: body.remark !== undefined ? body.remark || null : undefined,
        source: body.source !== undefined ? body.source || null : undefined,
        referrerId: body.referrerId !== undefined ? (body.referrerId ? parseInt(body.referrerId) : null) : undefined,
        assignedToId: body.assignedToId !== undefined ? (body.assignedToId ? parseInt(body.assignedToId) : null) : undefined,
        currentStatus: body.currentStatus !== undefined ? body.currentStatus || "LEAD" : undefined,
      },
    });

    return NextResponse.json(student);
  } catch (error: any) {
    console.error("PUT /api/students/[id] error:", error);
    return NextResponse.json({ error: error.message || "服务器错误" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requirePermission(request, "students:delete");
    if (denied) return denied;
    const { tenantId } = getContext(request);
    const { id } = await params;

    const existing = await prisma.student.findFirst({ where: { id: parseInt(id), tenantId } });
    if (!existing) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

    await prisma.student.delete({ where: { id: parseInt(id) } });
    await recordOperation(request, {
      module: "students",
      action: "DELETE",
      target: `学生:${existing.name}(id=${id})`,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/students/[id] error:", error);
    return NextResponse.json({ error: error.message || "服务器错误" }, { status: 500 });
  }
}
