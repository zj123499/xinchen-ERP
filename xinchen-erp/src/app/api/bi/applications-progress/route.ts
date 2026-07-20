/**
 * 学生申请进度大屏 API
 * GET /api/bi/applications-progress
 * 返回所有（近期）申请的 5 节点进度状态，供大屏滚动展示
 * 节点：0 材料准备 → 1 递交申请 → 2 递交签证 → 3 到校注册 → 4 结案
 *
 * 数据权限：admin/manager/finance 可查看全部；其他角色仅看本人负责的申请
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

const ALL_SCOPE_ROLES = ["admin", "manager", "finance"];

function getToken(request: NextRequest): string | undefined {
  const auth = request.headers.get("authorization");
  const bearer = auth?.replace("Bearer ", "");
  let cookieToken = request.cookies.get("token")?.value;
  if (!cookieToken) {
    const raw = request.headers.get("cookie") || "";
    const m = raw.match(/(?:^|;\s*)token=([^;]+)/);
    cookieToken = m ? decodeURIComponent(m[1]) : undefined;
  }
  return bearer || cookieToken;
}

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

// 5 个业务节点定义（与前端大屏一致）
const PROGRESS_NODES = [
  "材料准备",
  "递交申请",
  "递交签证",
  "到校注册",
  "结案",
] as const;

function calcStep(
  appStatus: string,
  visaStatuses: string[],
  orderStatus: string
): number {
  // 结案为终态
  if (orderStatus === "COMPLETED") return 4;
  // 到校注册：任意签证已批准
  if (visaStatuses.includes("APPROVED")) return 3;
  // 递交签证：处于 OFFER/ACCEPTED 且签证已启动
  if (
    (appStatus === "OFFER" || appStatus === "ACCEPTED") &&
    visaStatuses.some((v) => ["SUBMITTED", "APPROVED", "REJECTED", "APPEALING"].includes(v))
  ) {
    return 2;
  }
  // 递交申请：已提交 / 审核中 / 延期 / 已拿 offer / 已接受
  if (["SUBMITTED", "REVIEWING", "DEFERRED", "OFFER", "ACCEPTED"].includes(appStatus)) {
    return 1;
  }
  // 默认：材料准备阶段
  return 0;
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  if (!tenantId) return NextResponse.json({ error: "未授权" }, { status: 401 });

  // 从 JWT 解析用户角色，确定数据权限范围
  const token = getToken(request);
  const payload = token ? await verifyToken(token) : null;
  const roles = payload?.roles || [];
  const allScope = roles.some((r) => ALL_SCOPE_ROLES.includes(r));
  const meFilter = allScope ? {} : { student: { assignedToId: payload!.userId } };

  try {
    const apps = await prisma.application.findMany({
      where: { tenantId, ...meFilter },
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: {
        student: { select: { name: true, targetCountry: true, nationality: true } },
        visas: { select: { status: true } },
        order: { select: { status: true, orderNo: true } },
      },
    });

    const items = apps.map((a) => {
      const visaStatuses = a.visas.map((v) => v.status);
      const step = calcStep(a.status, visaStatuses, a.order.status);
      return {
        id: a.id,
        studentName: a.student.name,
        country: a.student.targetCountry || a.student.nationality || "—",
        institution: a.institutionName,
        major: a.majorName,
        degree: a.degree,
        status: a.status,
        orderStatus: a.order.status,
        currentStep: step,
        isClosed: a.order.status === "COMPLETED",
        updatedAt: a.updatedAt,
      };
    });

    // 各节点统计（到达该节点但未结案的人数）
    const nodeCounts = PROGRESS_NODES.map((_, idx) =>
      items.filter((it) => it.currentStep >= idx).length
    );
    const closedCount = items.filter((it) => it.isClosed).length;

    return NextResponse.json({
      scope: allScope ? "all" : "self",
      nodes: PROGRESS_NODES,
      total: items.length,
      nodeCounts,
      closedCount,
      items,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
