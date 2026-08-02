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
];
const MAX_SIZE = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const _denied = await requirePermission(request, "applications:update");
  if (_denied) return _denied;

  const { tenantId, userId } = getServerContext(request);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const offerIdStr = formData.get("offerId") as string;
    if (!file) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    if (!offerIdStr) return NextResponse.json({ error: "缺少 offerId" }, { status: 400 });

    const offerId = parseInt(offerIdStr);
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, tenantId },
      include: { application: { select: { studentId: true, student: { select: { id: true, name: true } } } } },
    });
    if (!offer) return NextResponse.json({ error: "Offer不存在" }, { status: 404 });
    const studentId = offer.application?.studentId;
    const bizName = offer.application?.student?.name || "";
    if (!studentId) return NextResponse.json({ error: "Offer未关联学生" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: `不支持的文件类型: ${file.type}` }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "文件超过 20MB 限制" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    const result = await storage.save({
      buffer,
      originalName: file.name,
      mimeType: file.type,
      businessType: "student_material",
      businessId: String(studentId),
      businessName: bizName,
      category: "offer",
    });
    if (!result.success) throw new Error(result.error || "存储失败");

    const record = await prisma.file.create({
      data: {
        tenantId, uploaderId: userId,
        originalName: file.name, storagePath: result.storagePath,
        mimeType: file.type, size: file.size,
        businessType: "student_material", businessId: studentId,
      },
    });

    await prisma.offer.update({
      where: { id: offerId },
      data: { attachmentUrl: `/api/files/${record.id}` },
    }).catch(() => {});

    return NextResponse.json({
      id: record.id, originalName: record.originalName, size: record.size,
      mimeType: record.mimeType, createdAt: record.createdAt,
      message: "上传成功",
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "上传失败，请稍后重试" }, { status: 500 });
  }
}
