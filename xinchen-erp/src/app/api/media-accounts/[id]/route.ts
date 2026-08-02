import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "media:view");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const account = await prisma.mediaAccount.findFirst({
    where: { id: parseInt(id), tenantId },
    include: {
      performances: {
        orderBy: { statDate: "desc" },
        take: 30,
      },
    },
  });

  if (!account) return NextResponse.json({ error: "新媒体账号不存在" }, { status: 404 });
  return NextResponse.json(account);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "media:update");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const body = await request.json();
  const { platform, accountName, accountId, followers, status } = body;

  const existing = await prisma.mediaAccount.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "新媒体账号不存在" }, { status: 404 });

  const updateData: any = {};
  if (platform) updateData.platform = platform;
  if (accountName) updateData.accountName = accountName;
  if (accountId !== undefined) updateData.accountId = accountId;
  if (followers !== undefined) updateData.followers = parseInt(followers);
  if (status !== undefined) updateData.status = status;

  const account = await prisma.mediaAccount.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  return NextResponse.json(account);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const _denied = await requirePermission(request, "media:delete");
    if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;

  const existing = await prisma.mediaAccount.findFirst({
    where: { id: parseInt(id), tenantId },
  });
  if (!existing) return NextResponse.json({ error: "新媒体账号不存在" }, { status: 404 });

  await prisma.mediaAccount.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
