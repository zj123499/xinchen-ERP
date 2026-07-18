/**
 * 利润报表 BI API
 * GET  /api/profit-reports        - 分页查询月度经营报表
 * POST /api/profit-reports        - 按指定年月自动汇总生成（或刷新）利润报表
 * POST /api/profit-reports/summarize?year=&month=  - 同上（兼容写法）
 *      不传 year/month 时，默认汇总上月（经营口径：收入-成本-佣金=净利）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getContext(request: NextRequest) {
  return {
    userId: parseInt(request.headers.get("x-user-id") || "0"),
    tenantId: parseInt(request.headers.get("x-tenant-id") || "0"),
  };
}

function toNum(d: any): number {
  return d ? Number(d) : 0;
}

export async function GET(request: NextRequest) {
  const { tenantId } = getContext(request);
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const fiscalYear = searchParams.get("fiscalYear") || "";
  const fiscalMonth = searchParams.get("fiscalMonth") || "";

  const where: any = { tenantId };
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);
  if (fiscalMonth) where.fiscalMonth = parseInt(fiscalMonth);

  const [total, list] = await Promise.all([
    prisma.profitReport.count({ where }),
    prisma.profitReport.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ fiscalYear: "desc" }, { fiscalMonth: "desc" }],
    }),
  ]);

  return NextResponse.json({
    total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
    list,
  });
}

export async function POST(request: NextRequest) {
  const { tenantId, userId } = getContext(request);
  const body = await request.json().catch(() => ({}));

  // 默认汇总上月
  const now = new Date();
  let year = parseInt(body.fiscalYear || body.year);
  let month = parseInt(body.fiscalMonth || body.month);
  if (!year || !month) {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    year = last.getFullYear();
    month = last.getMonth() + 1;
  }

  // 汇总当月收入 / 成本 / 佣金
  const [incomeAgg, costAgg, commissionAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: { tenantId, fiscalYear: year, fiscalMonth: month },
      _sum: { amount: true },
    }),
    prisma.cost.aggregate({
      where: { tenantId, fiscalYear: year, fiscalMonth: month },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { tenantId, fiscalYear: year, fiscalMonth: month },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = toNum(incomeAgg._sum.amount);
  const totalCost = toNum(costAgg._sum.amount);
  const totalCommission = toNum(commissionAgg._sum.amount);
  const netProfit = totalIncome - totalCost - totalCommission;

  const report = await prisma.profitReport.upsert({
    where: { tenantId_fiscalYear_fiscalMonth: { tenantId, fiscalYear: year, fiscalMonth: month } },
    update: {
      totalIncome,
      totalCost,
      totalCommission,
      netProfit,
    },
    create: {
      tenantId,
      fiscalYear: year,
      fiscalMonth: month,
      totalIncome,
      totalCost,
      totalCommission,
      netProfit,
    },
  });

  return NextResponse.json(
    { ...report, operatorId: userId, message: "汇总完成" },
    { status: 200 }
  );
}
