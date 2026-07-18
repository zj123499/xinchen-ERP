import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/** 从请求头或 IP 头提取客户端 IP */
export function getClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-client-ip") ||
    null
  );
}

function getActor(request: NextRequest): { userId: number; tenantId: number } {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

interface OperationInput {
  module: string;
  action: string; // CREATE/UPDATE/DELETE/EXPORT/IMPORT/APPROVE...
  target?: string;
  detail?: unknown;
}

/** 记录操作日志（谁做了什么）。失败静默，不影响主流程。 */
export async function recordOperation(
  request: NextRequest,
  input: OperationInput
): Promise<void> {
  try {
    const { userId, tenantId } = getActor(request);
    if (!tenantId || !userId) return;
    await prisma.operationLog.create({
      data: {
        tenantId,
        userId,
        module: input.module,
        action: input.action,
        target: input.target || null,
        detail: input.detail ? (input.detail as object) : undefined,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || null,
      },
    });
  } catch (e) {
    console.error("recordOperation failed:", e);
  }
}

interface LoginInput {
  tenantId: number;
  userId?: number;
  username?: string;
  status: "SUCCESS" | "FAILED";
  reason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** 记录登录日志（成功/失败）。失败静默。 */
export async function recordLogin(input: LoginInput): Promise<void> {
  try {
    await prisma.loginLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        username: input.username || null,
        status: input.status,
        reason: input.reason || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (e) {
    console.error("recordLogin failed:", e);
  }
}
