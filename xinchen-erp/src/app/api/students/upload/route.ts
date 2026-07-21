/**
 * 学生材料上传 API
 * POST /api/students/upload
 * multipart/form-data: file (文件), studentId (学生ID), category (分类，如"申请材料"/"offer"/"签证"/"其他")
 *
 * 存储路径: /tmp/erp_uploads/students/{studentId}/{category}/{timestamp}_{originalName}
 * 待本地服务器搭建后通过 UPLOAD_PATH 环境变量切换
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const STORAGE_BASE = process.env.UPLOAD_PATH || "/tmp/erp_uploads";
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_SIZE = 30 * 1024 * 1024; // 30MB

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

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

    // 验证学生存在
    const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
    if (!student) return NextResponse.json({ error: "学生不存在" }, { status: 404 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `不支持的文件类型: ${file.type}` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件超过 30MB 限制" }, { status: 400 });
    }

    // 安全文件名
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_");
    const dirPath = path.join(STORAGE_BASE, "students", String(studentId), category);
    const fileName = `${timestamp}_${safeName}`;
    const fullPath = path.join(dirPath, fileName);

    await mkdir(dirPath, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    const record = await prisma.file.create({
      data: {
        tenantId,
        uploaderId: userId,
        originalName: file.name,
        storagePath: fullPath,
        mimeType: file.type,
        size: file.size,
        businessType: "student_material",
        businessId: studentId,
      },
    });

    return NextResponse.json({
      id: record.id, originalName: record.originalName,
      size: record.size, mimeType: record.mimeType,
      category, createdAt: record.createdAt,
      message: "上传成功",
    }, { status: 201 });
  } catch (e: any) {
    console.error("学生材料上传失败:", e);
    return NextResponse.json({ error: "上传失败: " + (e.message || "未知") }, { status: 500 });
  }
}
