import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

// 查询某离职员工名下待重新分配的业务数据数量
export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const fromUserId = parseInt(searchParams.get("fromUserId") || "0");
  if (!fromUserId) return NextResponse.json({ error: "缺少 fromUserId" }, { status: 400 });

  const [leads, students, orders, tasks] = await Promise.all([
    prisma.lead.count({ where: { tenantId, assignedToId: fromUserId } }),
    prisma.student.count({ where: { tenantId, assignedToId: fromUserId } }),
    prisma.order.count({ where: { tenantId, assignedToId: fromUserId } }),
    prisma.copywriterTask.count({ where: { assignedToId: fromUserId } }),
  ]);
  return NextResponse.json({
    leads,
    students,
    orders,
    tasks,
    total: leads + students + orders + tasks,
  });
}

// 将离职员工（fromUserId）名下的业务数据重新分配给目标员工（toUserId）
export async function POST(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { fromUserId, toUserId } = await request.json();
  const f = parseInt(fromUserId);
  const t = parseInt(toUserId);
  if (!f || !t) return NextResponse.json({ error: "缺少 fromUserId / toUserId" }, { status: 400 });
  if (f === t) return NextResponse.json({ error: "不能分配到同一人" }, { status: 400 });

  const target = await prisma.user.findFirst({ where: { id: t, tenantId } });
  if (!target) return NextResponse.json({ error: "目标用户不存在" }, { status: 400 });

  const [leads, students, orders, tasks] = await Promise.all([
    prisma.lead.updateMany({ where: { tenantId, assignedToId: f }, data: { assignedToId: t } }),
    prisma.student.updateMany({ where: { tenantId, assignedToId: f }, data: { assignedToId: t } }),
    prisma.order.updateMany({ where: { tenantId, assignedToId: f }, data: { assignedToId: t } }),
    prisma.copywriterTask.updateMany({ where: { assignedToId: f }, data: { assignedToId: t } }),
  ]);

  return NextResponse.json({
    leads: leads.count,
    students: students.count,
    orders: orders.count,
    tasks: tasks.count,
  });
}
