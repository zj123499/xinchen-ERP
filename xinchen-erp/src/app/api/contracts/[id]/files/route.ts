/**
 * 合同文件列表 API
 * GET    /api/contracts/[id]/files - 列出合同附件
 * DELETE /api/contracts/[id]/files?fileId=xxx - 删除指定附件
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { getStorage } from "@/lib/storage";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const _denied = await requirePermission(request, "contracts:view");
  if (_denied) return _denied;

  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const contractId = parseInt(id);

  const files = await prisma.file.findMany({
    where: { tenantId, businessType: "contract_file", businessId: contractId },
    orderBy: { createdAt: "desc" },
    include: { uploader: { select: { id: true, realName: true, username: true } } },
  });

  const list = files.map((f) => ({
    id: f.id,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    sizeText: f.size < 1024 ? f.size + " B" : f.size < 1024 * 1024 ? (f.size / 1024).toFixed(1) + " KB" : (f.size / 1024 / 1024).toFixed(1) + " MB",
    uploaderName: f.uploader?.realName || f.uploader?.username || "-",
    createdAt: f.createdAt,
  }));

  return NextResponse.json({ list });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = getServerContext(request);
  const { id } = await params;
  const contractId = parseInt(id);
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "缺少 fileId" }, { status: 400 });

  const file = await prisma.file.findFirst({
    where: { id: parseInt(fileId), tenantId, businessType: "contract_file", businessId: contractId },
  });
  if (!file) return NextResponse.json({ error: "文件不存在" }, { status: 404 });

  const storage = getStorage();
  await storage.remove(file.storagePath);
  await prisma.file.delete({ where: { id: file.id } });

  // 如果删除后没有其他附件，清空 attachmentUrl
  const remaining = await prisma.file.count({
    where: { tenantId, businessType: "contract_file", businessId: contractId },
  });
  if (remaining === 0) {
    await prisma.contract.update({
      where: { id: contractId },
      data: { attachmentUrl: null },
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}