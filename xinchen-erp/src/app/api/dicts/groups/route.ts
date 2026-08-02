import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(request: NextRequest) {
  const { tenantId } = getServerContext(request);
  const groups = await prisma.dictGroup.findMany({
    where: { tenantId },
    orderBy: { sort: "asc" },
  });
  return NextResponse.json({ list: groups });
}

export async function POST(request: NextRequest) {
    const _denied = await requirePermission(request, "settings:manage");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const { name, label } = await request.json();
  if (!name) return NextResponse.json({ error: "请输入分组标识" }, { status: 400 });

  const existing = await prisma.dictGroup.findFirst({ where: { tenantId, name } });
  if (existing) return NextResponse.json(existing);

  const max = await prisma.dictGroup.findFirst({ where: { tenantId }, orderBy: { sort: "desc" }, select: { sort: true } });
  const group = await prisma.dictGroup.create({
    data: { tenantId, name, label: label || name, sort: (max?.sort || 0) + 1 },
  });
  return NextResponse.json(group, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { tenantId } = getServerContext(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });

  const { label } = await request.json();
  const group = await prisma.dictGroup.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!group) return NextResponse.json({ error: "分组不存在" }, { status: 404 });

  const updated = await prisma.dictGroup.update({
    where: { id: parseInt(id) },
    data: { label: label || null },
  });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const { tenantId } = getServerContext(request);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });

  const group = await prisma.dictGroup.findFirst({ where: { id: parseInt(id), tenantId } });
  if (!group) return NextResponse.json({ error: "分组不存在" }, { status: 404 });

  const itemCount = await prisma.dict.count({ where: { tenantId, groupName: group.name } });
  if (itemCount > 0) {
    return NextResponse.json({ error: "该分组下有 " + itemCount + " 个字典项，请先清空" }, { status: 400 });
  }
  await prisma.dictGroup.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
