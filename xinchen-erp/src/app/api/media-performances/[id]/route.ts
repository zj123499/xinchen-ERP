import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { impressions, clicks, leads, followersDelta } = body;

  const existing = await prisma.mediaPerformance.findFirst({
    where: { id: parseInt(id) },
  });
  if (!existing) return NextResponse.json({ error: "表现数据不存在" }, { status: 404 });

  const updateData: any = {};
  if (impressions !== undefined) updateData.impressions = parseInt(impressions);
  if (clicks !== undefined) updateData.clicks = parseInt(clicks);
  if (leads !== undefined) updateData.leads = parseInt(leads);
  if (followersDelta !== undefined) updateData.followersDelta = parseInt(followersDelta);

  const performance = await prisma.mediaPerformance.update({
    where: { id: parseInt(id) },
    data: updateData,
    include: {
      account: { select: { id: true, accountName: true, platform: true } },
    },
  });

  return NextResponse.json(performance);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.mediaPerformance.findFirst({
    where: { id: parseInt(id) },
  });
  if (!existing) return NextResponse.json({ error: "表现数据不存在" }, { status: 404 });

  await prisma.mediaPerformance.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
