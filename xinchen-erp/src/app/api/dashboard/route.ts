/**
 * 工作台统计 API（BI 看板）
 * GET /api/dashboard - 返回多维度统计数据
 *
 * 数据权限：
 *  - admin / manager / finance 角色 -> 查看全公司数据 (scope = "all")
 *  - 其他角色(销售/交付等) -> 仅查看自己负责的数据 (scope = "self")
 *    归属关系：线索/学生/订单按 assignedToId；合同/收款/申请按 student.assignedToId；
 *    佣金按 employee.userId；回访按 visitorId。成本为财务数据，仅全量角色可见。
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

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

// 拥有全公司数据视野的角色
const ALL_SCOPE_ROLES = ["admin", "manager", "finance"];

export async function GET(request: NextRequest) {
  const token = getToken(request);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "未授权" }, { status: 401 });

  // 直接从 JWT 解析，避免依赖中间件注入的 header（更稳健）
  const tenantId = payload.tenantId;
  const userId = payload.userId;
  const roles = payload.roles || [];
  const allScope = roles.some((r) => ALL_SCOPE_ROLES.includes(r));
  const scope = allScope ? "all" : "self";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // “本人”数据范围过滤条件
  const meFilter = allScope ? {} : { assignedToId: userId }; // 线索/学生/订单
  const meStudentFilter = allScope ? {} : { student: { assignedToId: userId } }; // 合同/收款/申请
  const visitFilter = allScope ? {} : { visitorId: userId }; // 回访
  const costFilter = allScope ? {} : { id: -1 }; // 成本仅全量角色可见

  // 佣金按当前用户对应的员工记录归属
  let myEmployeeId: number | null = null;
  if (!allScope) {
    const emp = await prisma.employee.findFirst({ where: { tenantId, userId } });
    myEmployeeId = emp?.id ?? null;
  }
  const commissionFilter = allScope ? {} : myEmployeeId ? { employeeId: myEmployeeId } : { id: -1 };

  try {
    const [
      // 核心指标
      todayLeads, pendingFollowLeads, monthContracts, monthPayments,
      todayVisitRecords, yearPayments, yearContracts, totalStudents, totalLeads,
      // 细粒度数据
      leadsBySource, leadsByStatus, leadsByAssignee,
      paymentsByType, paymentsByMonth,
      contractsByMonth, contractsByBusinessLine,
      applicationsByStatus, applicationsByInstitution,
      studentsByCountry, studentsByDegree,
      monthCosts, yearCosts,
      totalContracts, totalOrders, totalApplications, totalPayments, totalCosts,
      commissionsByStatus,
      recentLeads, recentPayments,
      visitRecordsByMonth,
      mediaAccountsCount, sitesCount, partnersCount, employeesCount,
    ] = await Promise.all([
      // === 核心指标 ===
      prisma.lead.count({ where: { tenantId, ...meFilter, createdAt: { gte: todayStart, lt: todayEnd } } }),
      prisma.lead.count({ where: { tenantId, ...meFilter, status: { in: ["NEW", "CONTACTED"] } } }),
      prisma.contract.count({ where: { tenantId, ...meStudentFilter, signDate: { gte: monthStart, lt: monthEnd }, status: { in: ["SIGNED", "APPROVED"] } } }),
      prisma.payment.aggregate({ where: { tenantId, ...meStudentFilter, fiscalYear: currentYear, fiscalMonth: currentMonth }, _sum: { amount: true } }),
      prisma.visitRecord.count({ where: { ...visitFilter, visitDate: { gte: todayStart, lt: todayEnd } } }),
      prisma.payment.aggregate({ where: { tenantId, ...meStudentFilter, paidAt: { gte: yearStart } }, _sum: { amount: true } }),
      prisma.contract.aggregate({ where: { tenantId, ...meStudentFilter, signDate: { gte: yearStart }, status: { in: ["SIGNED", "APPROVED"] } }, _sum: { totalAmount: true } }),
      prisma.student.count({ where: { tenantId, ...meFilter } }),
      prisma.lead.count({ where: { tenantId, ...meFilter } }),

      // === 线索维度 ===
      prisma.lead.groupBy({ by: ["source"], where: { tenantId, ...meFilter }, _count: { _all: true }, orderBy: { _count: { source: "desc" } } }),
      prisma.lead.groupBy({ by: ["status"], where: { tenantId, ...meFilter }, _count: { _all: true }, orderBy: { _count: { status: "desc" } } }),
      prisma.lead.groupBy({ by: ["assignedToId"], where: { tenantId, ...meFilter }, _count: { _all: true }, take: 10, orderBy: { _count: { assignedToId: "desc" } } }),

      // === 收款维度 ===
      prisma.payment.groupBy({ by: ["paymentType"], where: { tenantId, ...meStudentFilter, paidAt: { gte: yearStart } }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.payment.groupBy({ by: ["fiscalMonth"], where: { tenantId, ...meStudentFilter, fiscalYear: currentYear }, _sum: { amount: true }, _count: { _all: true }, orderBy: { fiscalMonth: "asc" } }),

      // === 合同维度 ===
      prisma.contract.findMany({ where: { tenantId, ...meStudentFilter, signDate: { gte: yearStart } }, select: { signDate: true, totalAmount: true, status: true }, orderBy: { signDate: "asc" } }),
      prisma.contract.groupBy({ by: ["businessLineId"], where: { tenantId, ...meStudentFilter, signDate: { gte: yearStart } }, _sum: { totalAmount: true }, _count: { _all: true } }),

      // === 申请维度 ===
      prisma.application.groupBy({ by: ["status"], where: { tenantId, ...meStudentFilter }, _count: { _all: true }, orderBy: { _count: { status: "desc" } } }),
      prisma.application.groupBy({ by: ["institutionName"], where: { tenantId, ...meStudentFilter }, _count: { _all: true }, take: 10, orderBy: { _count: { institutionName: "desc" } } }),

      // === 学生维度 ===
      prisma.student.groupBy({ by: ["targetCountry"], where: { tenantId, ...meFilter, targetCountry: { not: null } }, _count: { _all: true }, take: 10, orderBy: { _count: { targetCountry: "desc" } } }),
      prisma.student.groupBy({ by: ["targetDegree"], where: { tenantId, ...meFilter, targetDegree: { not: null } }, _count: { _all: true }, orderBy: { _count: { targetDegree: "desc" } } }),

      // === 成本维度 ===
      prisma.cost.aggregate({ where: { tenantId, ...costFilter, fiscalYear: currentYear, fiscalMonth: currentMonth }, _sum: { amount: true } }),
      prisma.cost.aggregate({ where: { tenantId, ...costFilter, fiscalYear: currentYear }, _sum: { amount: true } }),

      // === 汇总数 ===
      prisma.contract.count({ where: { tenantId, ...meStudentFilter } }),
      prisma.order.count({ where: { tenantId, ...meFilter } }),
      prisma.application.count({ where: { tenantId, ...meStudentFilter } }),
      prisma.payment.count({ where: { tenantId, ...meStudentFilter } }),
      prisma.cost.count({ where: { tenantId, ...costFilter } }),

      // === 佣金维度 ===
      prisma.commission.groupBy({ by: ["status"], where: { tenantId, ...commissionFilter }, _sum: { amount: true }, _count: { _all: true } }),

      // === 最近动态 ===
      prisma.lead.findMany({ where: { tenantId, ...meFilter }, orderBy: { createdAt: "desc" }, take: 5, include: { assignedTo: { select: { realName: true } } } }),
      prisma.payment.findMany({ where: { tenantId, ...meStudentFilter }, orderBy: { paidAt: "desc" }, take: 5, include: { student: { select: { name: true } } } }),

      // === 回访维度 ===
      prisma.visitRecord.groupBy({ by: ["visitType"], where: { ...visitFilter, visitDate: { gte: yearStart } }, _count: { _all: true } }),

      // === 其他模块计数（公司级聚合，非逐条业务数据） ===
      prisma.mediaAccount.count({ where: { tenantId } }),
      prisma.site.count({ where: { tenantId } }),
      prisma.partner.count({ where: { tenantId } }),
      prisma.employee.count({ where: { tenantId } }),
    ]);

    // 获取分配人名称
    const assigneeIds = leadsByAssignee.map((l) => l.assignedToId);
    const assignees = assigneeIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, realName: true, username: true } })
      : [];
    const assigneeMap = new Map(assignees.map((a) => [a.id, a.realName || a.username]));

    // 获取业务线名称
    const businessLineIds = contractsByBusinessLine.map((c) => c.businessLineId).filter(Boolean) as number[];
    const businessLines = businessLineIds.length > 0
      ? await prisma.businessLine.findMany({ where: { id: { in: businessLineIds } }, select: { id: true, name: true } })
      : [];
    const blMap = new Map(businessLines.map((b) => [b.id, b.name]));

    // 按月聚合合同数据
    const contractsMonthly: { month: string; count: number; amount: number }[] = [];
    const monthMap = new Map<string, { count: number; amount: number }>();
    contractsByMonth.forEach((c) => {
      const monthKey = new Date(c.signDate).toISOString().slice(0, 7);
      const existing = monthMap.get(monthKey) || { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += Number(c.totalAmount);
      monthMap.set(monthKey, existing);
    });
    monthMap.forEach((v, k) => contractsMonthly.push({ month: k, ...v }));
    contractsMonthly.sort((a, b) => a.month.localeCompare(b.month));

    const yearPaymentSum = Number(yearPayments._sum.amount || 0);
    const yearContractSum = Number(yearContracts._sum.totalAmount || 0);
    const completionRate = yearContractSum > 0 ? Math.round((yearPaymentSum / yearContractSum) * 100) : 0;
    const monthPaymentSum = Number(monthPayments._sum.amount || 0);
    const monthCostSum = Number(monthCosts._sum.amount || 0);
    const yearCostSum = Number(yearCosts._sum.amount || 0);

    const SOURCE_LABELS: Record<string, string> = {
      WALK_IN: "上门咨询", REFERRAL: "转介绍", MEDIA: "新媒体",
      SEARCH: "搜索引擎", PARTNER: "合作方", EXHIBITION: "展会", OTHER: "其他",
    };
    // 数据字典中的线索来源覆盖默认标签
    try {
      const dictSource = await prisma.dict.findMany({
        where: { tenantId, groupName: "lead_source" },
      });
      dictSource.forEach((d) => { SOURCE_LABELS[d.dictKey] = d.dictValue; });
    } catch { /* 忽略 */ }
    const STATUS_LABELS: Record<string, string> = {
      NEW: "新线索", CONTACTED: "已联系", QUALIFIED: "已筛选", CONVERTED: "已转化", DEAD: "已无效",
    };
    const PAYMENT_TYPE_LABELS: Record<string, string> = {
      CLIENT_FEE: "客户服务费", SCHOOL_COMMISSION: "学校返佣", PARTNER_FEE: "合作方费用", OTHER_INCOME: "其他收入",
    };

    // 本人视角下，将“按负责人分布”替换为“我的线索状态分布”，避免单一柱图
    const leadsByAssigneeFinal = allScope
      ? leadsByAssignee.map((l) => ({ label: assigneeMap.get(l.assignedToId) || `用户${l.assignedToId}`, value: l._count._all }))
      : leadsByStatus.map((s) => ({ label: STATUS_LABELS[s.status] || s.status, value: s._count._all }));

    return NextResponse.json({
      scope,
      // 核心指标
      todayNewLeads: todayLeads,
      pendingFollowLeads,
      monthContracts,
      monthPaymentAmount: monthPaymentSum,
      todayVisits: todayVisitRecords,
      yearCompletionRate: completionRate,
      totalStudents,
      totalLeads,
      yearPaymentAmount: yearPaymentSum,
      yearContractAmount: yearContractSum,
      // 总览
      overview: {
        totalContracts, totalOrders, totalApplications, totalPayments, totalCosts,
        totalStudents, totalLeads, mediaAccountsCount, sitesCount, partnersCount, employeesCount,
      },
      // 财务
      finance: {
        monthPaymentAmount: monthPaymentSum,
        monthCostAmount: monthCostSum,
        yearPaymentAmount: yearPaymentSum,
        yearCostAmount: yearCostSum,
        yearContractAmount: yearContractSum,
        monthProfit: monthPaymentSum - monthCostSum,
        yearProfit: yearPaymentSum - yearCostSum,
        completionRate,
      },
      // 线索分析
      leadsBySource: leadsBySource.map((s) => ({ label: SOURCE_LABELS[s.source] || s.source, value: s._count._all })),
      leadsByStatus: leadsByStatus.map((s) => ({ label: STATUS_LABELS[s.status] || s.status, value: s._count._all })),
      leadsByAssignee: leadsByAssigneeFinal,
      // 收款分析
      paymentsByType: paymentsByType.map((p) => ({ label: PAYMENT_TYPE_LABELS[p.paymentType] || p.paymentType, value: Number(p._sum.amount || 0), count: p._count._all })),
      paymentsByMonth: paymentsByMonth.map((p) => ({ label: `${p.fiscalMonth}月`, value: Number(p._sum.amount || 0), count: p._count._all })),
      // 合同分析
      contractsByMonth: contractsMonthly,
      contractsByBusinessLine: contractsByBusinessLine.map((c) => ({ label: c.businessLineId ? (blMap.get(c.businessLineId) || "未知") : "未分类", value: Number(c._sum.totalAmount || 0), count: c._count._all })),
      // 申请分析
      applicationsByStatus: applicationsByStatus.map((a) => ({ label: a.status, value: a._count._all })),
      applicationsByInstitution: applicationsByInstitution.map((a) => ({ label: a.institutionName, value: a._count._all })),
      // 学生分析
      studentsByCountry: studentsByCountry.map((s) => ({ label: s.targetCountry || "未知", value: s._count._all })),
      studentsByDegree: studentsByDegree.map((s) => ({ label: s.targetDegree || "未知", value: s._count._all })),
      // 佣金分析
      commissionsByStatus: commissionsByStatus.map((c) => ({ label: c.status, value: Number(c._sum.amount || 0), count: c._count._all })),
      // 回访分析
      visitRecordsByType: visitRecordsByMonth.map((v) => ({ label: v.visitType, value: v._count._all })),
      // 最近动态
      recentLeads: recentLeads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, status: l.status, assignee: l.assignedTo?.realName, createdAt: l.createdAt })),
      recentPayments: recentPayments.map((p) => ({ id: p.id, paymentNo: p.paymentNo, amount: Number(p.amount), studentName: p.student?.name, paidAt: p.paidAt, paymentType: p.paymentType })),
    });
  } catch (error) {
    console.error("工作台统计查询失败:", error);
    return NextResponse.json(
      { error: "获取统计数据失败", detail: String(error) },
      { status: 500 }
    );
  }
}
