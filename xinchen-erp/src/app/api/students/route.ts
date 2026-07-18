import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

function getContext(request: NextRequest) {
  return {
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = getContext(request);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const keyword = url.searchParams.get("keyword") || "";
    const status = url.searchParams.get("status") || "";

    const where: Prisma.StudentWhereInput = { tenantId };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
        { wechat: { contains: keyword } },
      ];
    }
    if (status) where.currentStatus = status;

    const [total, list] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, realName: true } },
          _count: { select: { leads: true, followUps: true, contracts: true, applications: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
  } catch (error: any) {
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: error.message || "服务器错误" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = getContext(request);
    const body = await request.json();

    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        tenantId,
        name: String(body.name).trim(),
        gender: body.gender || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        phone: body.phone || null,
        wechat: body.wechat || null,
        email: body.email || null,
        idNumber: body.idNumber || null,
        passportNo: body.passportNo || null,
        nationality: body.nationality || null,
        currentSchool: body.currentSchool || null,
        currentMajor: body.currentMajor || null,
        education: body.education || null,
        gpa: body.gpa !== undefined && body.gpa !== null && body.gpa !== "" ? parseFloat(body.gpa) : null,
        targetCountry: body.targetCountry || null,
        targetDegree: body.targetDegree || null,
        targetMajor: body.targetMajor || null,
        budget: body.budget !== undefined && body.budget !== null && body.budget !== "" ? parseFloat(body.budget) : null,
        emergencyContact: body.emergencyContact || null,
        emergencyPhone: body.emergencyPhone || null,
        remark: body.remark || null,
        source: body.source || null,
        referrerId: body.referrerId ? parseInt(body.referrerId) : null,
        assignedToId: body.assignedToId ? parseInt(body.assignedToId) : null,
        currentStatus: body.currentStatus || "LEAD",
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/students error:", error);
    return NextResponse.json({ error: error.message || "服务器错误" }, { status: 500 });
  }
}
