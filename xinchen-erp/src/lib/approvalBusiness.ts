/**
 * 审批流业务联动（P4.5 业务接入）
 * - submitApproval：业务方提交审批，按 businessType 找到启用的审批流并建首节点记录
 * - applyApprovalResult：审批最终通过/驳回时，回写对应业务状态
 */

import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface SubmitApprovalInput {
  tenantId: number;
  applicantId: number;
  businessType: string; // CONTRACT_DISCOUNT / REFUND / REIMBURSEMENT / LEAD_TRANSFER
  businessId: number;
  comment?: string;
  attachments?: unknown;
}

/**
 * 业务提交审批：找到该业务类型启用的审批流，创建首节点审批记录。
 * 返回 approvalRecordId；若未配置审批流则抛出错误。
 */
export async function submitApproval(input: SubmitApprovalInput): Promise<number> {
  const flow = await prisma.approvalFlow.findFirst({
    where: { tenantId: input.tenantId, businessType: input.businessType, enabled: true },
    include: { nodes: { orderBy: { orderNo: "asc" } } },
  });
  if (!flow || flow.nodes.length === 0) {
    throw new Error("未配置该业务类型的审批流，请联系管理员");
  }
  const firstNode = flow.nodes[0];
  const record = await prisma.approvalRecord.create({
    data: {
      tenantId: input.tenantId,
      flowId: flow.id,
      nodeId: firstNode.id,
      businessType: input.businessType,
      businessId: input.businessId,
      applicantId: input.applicantId,
      approverId: firstNode.approverId,
      status: "PENDING",
      comment: input.comment || null,
      attachments: (input.attachments as object) ?? null,
      currentNodeOrder: firstNode.orderNo,
    },
  });

  if (firstNode.approverId) {
    await prisma.notification
      .create({
        data: {
          userId: firstNode.approverId,
          title: `待审批：${flow.name}`,
          content: `您有一条${flow.name}审批待处理${input.comment ? `（备注：${input.comment}）` : ""}`,
          type: "approval",
          link: `/approval-records`,
        },
      })
      .catch(() => {});
  }
  return record.id;
}

/**
 * 审批最终通过：回写业务状态。
 * - REFUND：Refund.status -> APPROVED（可执行退款）
 * - REIMBURSEMENT：Reimbursement.status -> APPROVED（可打款）
 * - CONTRACT_DISCOUNT：Contract 保持；折扣已在提交时写入，审批通过即生效标记
 * - LEAD_TRANSFER：LeadTransferLog.applied -> true 并执行实际划转
 */
export async function applyApproved(db: PrismaClient, businessType: string, businessId: number) {
  switch (businessType) {
    case "REFUND":
      await db.refund.update({
        where: { id: businessId },
        data: { status: "APPROVED" },
      });
      break;
    case "REIMBURSEMENT":
      await db.reimbursement.update({
        where: { id: businessId },
        data: { status: "APPROVED" },
      });
      break;
    case "CONTRACT_DISCOUNT":
      await db.contract.update({
        where: { id: businessId },
        data: { status: "APPROVED" },
      });
      break;
    case "LEAD_TRANSFER": {
      const log = await db.leadTransferLog.findUnique({ where: { id: businessId } });
      if (log && !log.applied) {
        await db.$transaction([
          db.lead.update({ where: { id: log.leadId }, data: { assignedToId: log.toUserId } }),
          db.leadTransferLog.update({ where: { id: businessId }, data: { applied: true } }),
        ]);
      }
      break;
    }
  }
}

/**
 * 审批驳回：回写业务状态。
 * - REFUND：Refund.status -> REJECTED
 * - REIMBURSEMENT：Reimbursement.status -> REJECTED
 * - CONTRACT_DISCOUNT：Contract 折扣不生效（状态回 DRAFT）
 * - LEAD_TRANSFER：标记 applied=false（不执行划转）
 */
export async function applyRejected(db: PrismaClient, businessType: string, businessId: number) {
  switch (businessType) {
    case "REFUND":
      await db.refund.update({ where: { id: businessId }, data: { status: "REJECTED" } });
      break;
    case "REIMBURSEMENT":
      await db.reimbursement.update({ where: { id: businessId }, data: { status: "REJECTED" } });
      break;
    case "CONTRACT_DISCOUNT":
      await db.contract.update({ where: { id: businessId }, data: { status: "DRAFT" } });
      break;
    case "LEAD_TRANSFER":
      await db.leadTransferLog.update({ where: { id: businessId }, data: { applied: false } });
      break;
  }
}
