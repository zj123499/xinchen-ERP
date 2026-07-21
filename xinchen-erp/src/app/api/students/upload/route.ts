/**
 * 学生材料上传 API
 * POST /api/students/upload
 * multipart: file + studentId + category
 * 存储后端通过 STORAGE_BACKEND 切换（local/nextcloud）
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
  "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_SIZE = 30 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const { tenantId, userId } = getContext(request);
  if (!tenantId || !userId) return NextResponse.json({ error: "未授权" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const studentIdStr = formData.get("studentId") as string;
    const category = (formData.get("category") as string) || "其他";

    if (!file) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    if (!studentIdStr) return NextResponse.json({ error: "缺少学生ID" }, { status: 400 });
    const studentId = parseInt(studentIdStr);

    const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
    if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: `不支持的文件类型: ${file.type}` }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "文件超过 30MB 限制" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    const result = await storage.save({
      buffer, originalName: file.name, mimeType: file.type,
      businessType: "student_material", businessId: String(studentId), category,
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

    return NextResponse.json({
      id: record.id, originalName: record.originalName, size: record.size,
      mimeType: record.mimeType, category, createdAt: record.createdAt,
      storageBackend: storage.getType(), message: "上传成功",
    }, { status: 201 });
  } catch (e: any) {
    console.error("学生材料上传失败:", e);
    return NextResponse.json({ error: "上传失败: " + (e.message || "未知") }, { status: 500 });
  }
}
