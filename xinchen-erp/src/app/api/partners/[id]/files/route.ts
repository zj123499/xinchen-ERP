import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const partnerId = parseInt(id);

  const files = await prisma.file.findMany({
    where: { tenantId, businessType: "partner_contract", businessId: partnerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, originalName: true, storagePath: true, mimeType: true, size: true, createdAt: true,
      uploader: { select: { realName: true } },
    },
  });

  return NextResponse.json({
    list: files.map((f) => ({
      id: f.id, originalName: f.originalName, mimeType: f.mimeType,
      size: f.size, sizeText: formatSize(f.size),
      uploaderName: f.uploader.realName, createdAt: f.createdAt,
    })),
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fileId = parseInt(searchParams.get("fileId") || "0");
  if (!fileId) return NextResponse.json({ error: "缺少 fileId" }, { status: 400 });

  const file = await prisma.file.findFirst({
    where: { id: fileId, tenantId, businessType: "partner_contract", businessId: parseInt(id) },
  });
  if (!file) return NextResponse.json({ error: "文件不存在" }, { status: 404 });

  const storage = getStorage();
  await storage.remove(file.storagePath);
  await prisma.file.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}
