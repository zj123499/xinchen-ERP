export const dynamic = "force-dynamic";
/**
 * 文书任务 API
 * GET  /api/copywriter-tasks?applicationId=&assignedToId=&status=  - 文书任务清单
 * POST /api/copywriter-tasks                                        - 新增文书任务
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest) {

const _denied = await requirePermission(request, "applications:view");

if (_denied) return _denied;


  const { tenantId } = getServerContext(request);
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  const assignedToId = searchParams.get("assignedToId");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");

  const where: any = { application: { tenantId } };
  if (applicationId) where.applicationId = parseInt(applicationId);
  if (assignedToId) where.assignedToId = parseInt(assignedToId);
  if (status) where.status = status;

  const [total, list] = await Promise.all([
    prisma.copywriterTask.count({ where }),
    prisma.copywriterTask.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ status: "asc" }, { id: "desc" }],
      include: {
        application: {
          select: {
            id: true, institutionName: true, majorName: true,
            student: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {

const _denied = await requirePermission(request, "applications:update");

if (_denied) return _denied;


  const { tenantId } = getServerContext(request);
  const body = await request.json();
  const { applicationId, taskType, assignedToId, content, dueDate } = body;

  if (!applicationId || !taskType || !assignedToId) {
    return NextResponse.json({ error: "申请、任务类型、负责人为必填项" }, { status: 400 });
  }
  const app = await prisma.application.findFirst({ where: { id: parseInt(applicationId), tenantId } });
  if (!app) return NextResponse.json({ error: "申请不存在" }, { status: 404 });

  const task = await prisma.copywriterTask.create({
    data: {
      applicationId: parseInt(applicationId),
      taskType,
      assignedToId: parseInt(assignedToId),
      content: content || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "pending",
    },
    include: {
      application: {
        select: {
          id: true, institutionName: true, majorName: true,
          student: { select: { id: true, name: true } },
        },
      },
    },
  });
  return NextResponse.json(task, { status: 201 });
}
