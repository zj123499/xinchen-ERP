import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "";

  const files = await prisma.file.findMany({
    where: { tenantId, businessType: "student_material", businessId: parseInt(id) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, originalName: true, storagePath: true,
      mimeType: true, size: true, createdAt: true,
      uploader: { select: { realName: true } },
    },
  });

  const list = files.map((f) => {
    const parts = f.storagePath.split("/");
    const sId = String(id);
    const catIdx = parts.findIndex((p) => p === sId);
    const cat = catIdx >= 0 && catIdx + 1 < parts.length ? parts[catIdx + 1] : "其他";
    return {
      id: f.id, originalName: f.originalName, mimeType: f.mimeType,
      size: f.size, sizeText: formatSize(f.size), category: cat,
      uploaderName: f.uploader.realName, createdAt: f.createdAt,
    };
  });

  const filtered = category ? list.filter((f) => f.category === category) : list;
  const categoryCounts: Record<string, number> = {};
  list.forEach((f) => { categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1; });

  return NextResponse.json({
    list: filtered, total: filtered.length, allTotal: list.length,
    categories: Object.entries(categoryCounts).map(([n, c]) => ({ name: n, count: c })),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fileId = parseInt(searchParams.get("fileId") || "0");
  if (!fileId) return NextResponse.json({ error: "缺少 fileId" }, { status: 400 });

  const file = await prisma.file.findFirst({
    where: { id: fileId, tenantId, businessType: "student_material", businessId: parseInt(id) },
  });
  if (!file) return NextResponse.json({ error: "文件不存在" }, { status: 404 });

  try { await unlink(file.storagePath); } catch {}
  await prisma.file.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}
