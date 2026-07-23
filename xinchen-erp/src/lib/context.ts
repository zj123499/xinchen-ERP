/**
 * 共享请求上下文（替代各 API 中重复的 getContext 函数）
 * middleware 已将 x-user-id / x-tenant-id / x-user-roles 注入请求头
 */
import { NextRequest } from "next/server";

export interface Ctx {
  userId: number;
  tenantId: number;
  roles: string[];
}

export function getContext(request: NextRequest): Ctx {
  const roleStr = request.headers.get("x-user-roles") || "";
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
    roles: roleStr.split(",").map((r) => r.trim()).filter(Boolean),
  };
}
