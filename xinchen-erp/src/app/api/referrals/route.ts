export const dynamic = "force-dynamic";
/**
 * 转介绍管理 API（客户成功中心）
 * GET  /api/referrals - 列表（按状态筛选）
 * POST /api/referrals - 新增转介绍
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/lib/server-context";
import { requirePermission } from "@/lib/permission";
import { Prisma } from "@prisma/client";


export async function GET(request: NextRequest) {
    const _denied = await requirePermission(request, "referrals:view");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const status = url.searchParams.get("status") || "";

  const where: Prisma.ReferralWhereInput = { tenantId };
  if (status) where.status = status as Prisma.EnumReferralStatusFilter["equals"];

  const [total, list] = await Promise.all([
    prisma.referral.count({ where }),
    prisma.referral.findMany({
      where,
      include: {
        referrer: { select: { id: true, name: true } },
        newStudent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, totalPages: Math.ceil(total / pageSize), list });
}

export async function POST(request: NextRequest) {
    const _denied = await requirePermission(request, "referrals:create");
  if (_denied) return _denied;

const { tenantId } = getServerContext(request);
  const body = await request.json();
  const { referrerId, refereeName, refereePhone, rewardType, rewardAmount, remark } = body;

  if (!referrerId || !refereeName) {
    return NextResponse.json({ error: "推荐人和被推荐人姓名为必填项" }, { status: 400 });
  }

  const referral = await prisma.referral.create({
    data: {
      tenantId,
      referrerId: parseInt(referrerId),
      refereeName,
      refereePhone: refereePhone || null,
      rewardType: rewardType || null,
      rewardAmount: rewardAmount ? parseFloat(rewardAmount) : null,
      status: "PENDING",
      remark: remark || null,
    },
  });
  return NextResponse.json(referral, { status: 201 });
}
