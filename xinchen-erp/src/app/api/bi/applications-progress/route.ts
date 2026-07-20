/**
 * 学生申请进度大屏 API
 * GET /api/bi/applications-progress
 * 返回所有（近期）申请的 5 节点进度状态，供大屏滚动展示
 * 节点：0 材料准备 → 1 递交申请 → 2 递交签证 → 3 到校注册 → 4 结案
 *
 * 数据权限：按角色权限配置决定
 *  - 拥有 applications:view → 可查看全公司申请进度
 *  - 无此权限 → 返回空数据
 *  - admin 角色拥有全部权限
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { getViewPermissions } from "@/lib/permission";

const EMPTY = { id: -1 };

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
  if (orderStatus === "COMPLETED") return 4;
  if (visaStatuses.includes("APPROVED")) return 3;
  if (
    (appStatus === "OFFER" || appStatus === "ACCEPTED") &&
    visaStatuses.some((v) => ["SUBMITTED", "APPROVED", "REJECTED", "APPEALING"].includes(v))
  ) {
    return 2;
  }
  if (["SUBMITTED", "REVIEWING", "DEFERRED", "OFFER", "ACCEPTED"].includes(appStatus)) {
    return 1;
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const tenantId = payload.tenantId;
  const roles = payload.roles || [];

  // 按模块权限决定是否可见
  const perm = await getViewPermissions(tenantId, roles);
  const appFilter = perm.applications ? {} : EMPTY;

  try {
    const apps = await prisma.application.findMany({
      where: { tenantId, ...appFilter },
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

    const nodeCounts = PROGRESS_NODES.map((_, idx) =>
      items.filter((it) => it.currentStep >= idx).length
    );
    const closedCount = items.filter((it) => it.isClosed).length;

    return NextResponse.json({
      scope: perm.applications ? "visible" : "hidden",
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
