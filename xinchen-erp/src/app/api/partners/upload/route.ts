/**
 * 合作方合同文件上传 API
 * POST /api/partners/upload
 *
 * 存储后端通过 STORAGE_BACKEND 环境变量切换：
 *   local / 默认 → /tmp/erp_uploads
 *   nextcloud     → NextCloud WebDAV（配 NEXTCLOUD_URL/USER/PASS）
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorage } from "@/lib/storage";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

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
  const { tenantId, userId } = getContext(request);
  if (!tenantId || !userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const partnerIdStr = formData.get("partnerId") as string;
    if (!file) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    if (!partnerIdStr) return NextResponse.json({ error: "缺少合作方ID" }, { status: 400 });

    const partnerId = parseInt(partnerIdStr);
    const partner = await prisma.partner.findFirst({ where: { id: partnerId, tenantId } });
    if (!partner) return NextResponse.json({ error: "合作方不存在" }, { status: 404 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: `不支持的文件类型: ${file.type}` }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "文件超过 20MB 限制" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    const result = await storage.save({
      buffer,
      originalName: file.name,
      mimeType: file.type,
      businessType: "partner_contract",
      businessId: String(partnerId),
    });

    if (!result.success) throw new Error(result.error || "存储失败");

    const record = await prisma.file.create({
      data: {
        tenantId, uploaderId: userId,
        originalName: file.name, storagePath: result.storagePath,
        mimeType: file.type, size: file.size,
        businessType: "partner_contract", businessId: partnerId,
      },
    });

    return NextResponse.json({
      id: record.id, originalName: record.originalName, size: record.size,
      mimeType: record.mimeType, createdAt: record.createdAt,
      storageBackend: storage.getType(), message: "上传成功",
    }, { status: 201 });
  } catch (e: any) {
    console.error("文件上传失败:", e);
    return NextResponse.json({ error: "上传失败: " + (e.message || "未知") }, { status: 500 });
  }
}
