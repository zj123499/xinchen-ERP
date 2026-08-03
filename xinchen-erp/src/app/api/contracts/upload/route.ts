export const dynamic = "force-dynamic";
/**
 * 合同文件上传 API
 * POST /api/contracts/upload
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { getStorage } from "@/lib/storage";


const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const _denied = await requirePermission(request, "contracts:update");
  if (_denied) return _denied;

  const { tenantId, userId } = getServerContext(request);
  if (!tenantId || !userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contractIdStr = formData.get("contractId") as string;
    if (!file) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    if (!contractIdStr) return NextResponse.json({ error: "缺少合同ID" }, { status: 400 });

    const contractId = parseInt(contractIdStr);
    const contract = await prisma.contract.findFirst({ where: { id: contractId, tenantId }, include: { partner: { select: { name: true } }, student: { select: { name: true } } } });
    if (!contract) return NextResponse.json({ error: "合同不存在" }, { status: 404 });
    const bizName = contract.partner?.name || contract.student?.name || "";
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: `不支持的文件类型: ${file.type}` }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "文件超过 20MB 限制" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    const result = await storage.save({
      buffer,
      originalName: file.name,
      mimeType: file.type,
      businessType: "contract_file",
      businessId: String(contractId),
      businessName: bizName,
    });

    if (!result.success) throw new Error(result.error || "存储失败");

    const record = await prisma.file.create({
      data: {
        tenantId, uploaderId: userId,
        originalName: file.name, storagePath: result.storagePath,
        mimeType: file.type, size: file.size,
        businessType: "contract_file", businessId: contractId,
      },
    });

    // 更新合同的 attachmentUrl 为最新文件的引用
    await prisma.contract.update({
      where: { id: contractId },
      data: { attachmentUrl: `/api/files/${record.id}` },
    }).catch(() => {});

    return NextResponse.json({
      id: record.id, originalName: record.originalName, size: record.size,
      mimeType: record.mimeType, createdAt: record.createdAt,
      storageBackend: storage.getType(), message: "上传成功",
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "上传失败，请稍后重试" }, { status: 500 });
  }
}