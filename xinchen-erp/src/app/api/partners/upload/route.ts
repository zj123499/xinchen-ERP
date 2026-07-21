/**
 * 合作方合同文件上传 API
 * POST /api/partners/upload
 * 接收 multipart/form-data: file (文件), partnerId (合作方ID)
 *
 * 存储路径: /uploads/partners/{partnerId}/{timestamp}_{originalName}
 * 待公司本地服务器搭建后，修改 STORAGE_BASE 指向 NAS/本地存储即可
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// 文件存储根目录
// 当前使用 /tmp/erp_uploads（容器可写目录）
// 待公司本地服务器搭建后，改为环境变量 UPLOAD_PATH 指向 NAS/本地存储
const STORAGE_BASE = process.env.UPLOAD_PATH || "/tmp/erp_uploads";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

// 允许的文件类型
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  const { tenantId, userId } = getContext(request);
  if (!tenantId || !userId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const partnerIdStr = formData.get("partnerId") as string;

    if (!file) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    if (!partnerIdStr) return NextResponse.json({ error: "缺少合作方ID" }, { status: 400 });

    const partnerId = parseInt(partnerIdStr);

    // 验证合作方存在且属于当前租户
    const partner = await prisma.partner.findFirst({
      where: { id: partnerId, tenantId },
    });
    if (!partner) return NextResponse.json({ error: "合作方不存在" }, { status: 404 });

    // 文件类型校验
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `不支持的文件类型: ${file.type}。支持 PDF/图片/Word/Excel` }, { status: 400 });
    }

    // 文件大小校验
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件超过 20MB 限制" }, { status: 400 });
    }

    // 构造存储路径
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_");
    const dirPath = path.join(STORAGE_BASE, "partners", String(partnerId));
    const fileName = `${timestamp}_${safeName}`;
    const fullPath = path.join(dirPath, fileName);

    // 确保目录存在
    await mkdir(dirPath, { recursive: true });

    // 写入文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    // 记录到数据库
    const record = await prisma.file.create({
      data: {
        tenantId,
        uploaderId: userId,
        originalName: file.name,
        storagePath: fullPath,
        mimeType: file.type,
        size: file.size,
        businessType: "partner_contract",
        businessId: partnerId,
      },
    });

    return NextResponse.json({
      id: record.id,
      originalName: record.originalName,
      size: record.size,
      mimeType: record.mimeType,
      createdAt: record.createdAt,
      message: "上传成功",
    }, { status: 201 });

  } catch (e: any) {
    console.error("文件上传失败:", e);
    return NextResponse.json({ error: "上传失败: " + (e.message || "未知错误") }, { status: 500 });
  }
}
