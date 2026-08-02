import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(
  request: NextRequest,
  {
 const _denied = await requirePermission(request, "settings:manage");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const salary = await prisma.salary.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  if (!salary) return NextResponse.json({ error: "薪资记录不存在" }, { status: 404 });
  return NextResponse.json(salary);
}

export async function PUT(
  request: NextRequest,
  {
 const _denied = await requirePermission(request, "settings:manage");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { baseSalary, bonus, commission, deduction, status } = body;

  const existing = await prisma.salary.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "薪资记录不存在" }, { status: 404 });

  const b = baseSalary !== undefined ? parseFloat(baseSalary) : Number(existing.baseSalary);
  const bn = bonus !== undefined ? parseFloat(bonus) : Number(existing.bonus);
  const cm = commission !== undefined ? parseFloat(commission) : Number(existing.commission);
  const dd = deduction !== undefined ? parseFloat(deduction) : Number(existing.deduction);
  const net = b + bn + cm - dd;

  const salary = await prisma.salary.update({
    where: { id: parseInt(id) },
    data: {
      baseSalary: b,
      bonus: bn,
      commission: cm,
      deduction: dd,
      netSalary: net,
      status: status || existing.status,
    },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  return NextResponse.json(salary);
}

export async function DELETE(
  request: NextRequest,
  {
 const _denied = await requirePermission(request, "settings:manage");
 if (_denied) return _denied;
 params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.salary.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "薪资记录不存在" }, { status: 404 });

  await prisma.salary.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
