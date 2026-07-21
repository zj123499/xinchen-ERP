/**
 * NextCloud 连接状态检查
 * GET /api/system/nextcloud-status — 返回配置和连接状态
 */
import { NextRequest, NextResponse } from "next/server";
import { checkNextcloudStatus } from "@/lib/storage";
import { isAdmin } from "@/lib/permission";

export async function GET(request: NextRequest) {
  const roles = (request.headers.get("x-user-roles") || "").split(",").filter(Boolean);
  if (!isAdmin(roles)) return NextResponse.json({ error: "仅管理员" }, { status: 403 });

  const status = await checkNextcloudStatus();
  return NextResponse.json({
    ...status,
    storageBackend: process.env.STORAGE_BACKEND || "local",
    config: {
      url: process.env.NEXTCLOUD_URL ? "***已配置***" : "未配置",
      user: process.env.NEXTCLOUD_USER ? "***已配置***" : "未配置",
    },
  });
}
