/**
 * 氚云数据导入脚本 — 一次性导入，使用 create 避免 upsert 约束依赖
 */
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data-import");

const prisma = new PrismaClient();
const TENANT_ID = 1;
const userNameToId = {};
const studentNameToId = {};
let total = 0;

function readExcel(filename) {
  const buf = readFileSync(join(DATA_DIR, filename));
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets["Sheet1"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (rows.length < 3) return [];
  const names = rows[1];
  return rows.slice(2).map(row => {
    const obj = {};
    row.forEach((v, i) => { if (i < names.length && names[i]) obj[String(names[i]).trim()] = v; });
    return obj;
  }).filter(r => Object.keys(r).length > 0);
}

function userId(name) { return userNameToId[String(name || "").trim()] || null; }
function cleanPhone(phone) { return phone ? String(phone).trim().replace(/^(\+86|86)/, "") : null; }
function money(v) { const n = parseFloat(String(v || "").replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; }
function dt(v) { if (!v) return null; try { return new Date(v); } catch { return null; } }
function s(v) { return String(v || "").trim(); }
function ok(n, fn) { total++; console.log(`  ✓ ${n} | ${fn}`); }

// ========== 主流程 ==========
async function main() {
  console.log("🚀 氚云数据导入\n");

  // 0. 预加载用户映射
  (await prisma.user.findMany({ where: { tenantId: TENANT_ID }, select: { id: true, realName: true, username: true } }))
    .forEach(u => {
      if (u.realName) userNameToId[u.realName] = u.id;
      userNameToId[u.username] = u.id;
    });
  console.log(`📋 用户映射: ${Object.keys(userNameToId).length} 人\n`);

  // 1. Partner (14条)
  console.log("═══ 1/9 B端渠道 → Partner ═══");
  for (const r of readExcel("B端渠道_2026-08-03-14-03-06-844.xlsx")) {
    await prisma.partner.create({ data: {
      tenantId: TENANT_ID, name: s(r["渠道名称"]), type: "agency",
      contactName: s(r["对接人"]) || null, contactPhone: cleanPhone(r["联系电话"]),
      remark: `来源:${s(r["来源"])}|签约:${s(r["签约状态"])}`, status: "active",
    }}).then(() => ok(total, s(r["渠道名称"]))).catch(() => {});
  }

  // 2. Lead (21条)
  console.log("\n═══ 2/9 线索类型 → Lead ═══");
  const leadStatusMap = { "未跟进": "NEW", "已跟进": "CONTACTED" };
  for (const r of readExcel("线索类型_2026-08-03-14-05-03-339.xlsx")) {
    const sub = s(r["自媒体类型"]);
    const remark = [
      r["备注"] && `咨询:${s(r["备注"]).substring(0, 500)}`,
      r["客户微信号"] && `微信:${s(r["客户微信号"])}`,
      r["营销状态"] && `营销:${s(r["营销状态"])}`,
      r["是否转客户"] === "是" && "【已转客户】",
    ].filter(Boolean).join(" | ");
    await prisma.lead.create({ data: {
      tenantId: TENANT_ID, name: s(r["客户名称"]),
      phone: cleanPhone(r["客户手机号"]) || `lead_${Date.now()}`,
      source: sub ? `自媒体-${sub}` : s(r["线索类型"]),
      status: leadStatusMap[s(r["跟进状态"])] || "NEW",
      remark: remark || null,
      assignedToId: userId(r["自媒体人员"] || r["拥有者(必填)"]) || 1,
      createdAt: dt(r["创建时间"]) || new Date(),
    }}).then(() => ok(total, s(r["客户名称"]))).catch(e => {});
  }

  // 3. 意向学生 → Student (20条)
  console.log("\n═══ 3/9 意向学生 → Student ═══");
  for (const r of readExcel("意向学生_2026-08-03-14-04-05-633.xlsx")) {
    const name = s(r["客户名称"]);
    const st = await prisma.student.create({ data: {
      tenantId: TENANT_ID, name, phone: cleanPhone(r["客户手机号"]) || `stu_${Date.now()}`,
      currentStatus: "LEAD", assignedToId: userId(r["成交人(必填)"]) || 1,
      remark: [r["备注"] && `咨询:${s(r["备注"]).substring(0, 300)}`, r["微信号"] && `微信:${s(r["微信号"])}`].filter(Boolean).join(" | ") || null,
    }});
    studentNameToId[name] = st.id; ok(total, name);
  }

  // 4. 已签约 → Contract (20条)
  console.log("\n═══ 4/9 已签约 → Contract ═══");
  for (const r of readExcel("已签约_2026-08-03-14-02-37-502.xlsx")) {
    const name = s(r["学生姓名"]);
    const phone = cleanPhone(r["电话"]);
    let sid = studentNameToId[name];
    if (!sid) {
      const st = await prisma.student.create({ data: {
        tenantId: TENANT_ID, name, phone: phone || `signed_${Date.now()}`,
        currentStatus: "SIGNED", currentSchool: s(r["所在大学"]) || null,
        targetCountry: s(r["申请国别"]) || null, assignedToId: userId(r["成交老师"]) || 1,
        source: s(r["渠道来源"]) || null, remark: s(r["备注"]) || null,
      }});
      sid = st.id; studentNameToId[name] = sid; ok(total, `+Student:${name}`);
    }
    await prisma.contract.create({ data: {
      tenantId: TENANT_ID, studentId: sid,
      contractNo: s(r["回款编号"]) || `HT_${Date.now()}`,
      totalAmount: money(r["成交金额"]) || money(r["首款金额"]) || 0,
      discountRate: parseFloat(r["折扣"]) || null,
      signDate: dt(r["签约时间"]) || new Date(), status: "SIGNED", currency: "CNY",
      remark: `渠道:${s(r["渠道来源"])}|方式:${s(r["签约方式"])}`,
    }}).then(() => ok(total, `Contract:${name}`)).catch(() => {});
  }

  // 5. 回款 → Payment (20条)
  console.log("\n═══ 5/9 回款表单 → Payment ═══");
  for (const r of readExcel("回款表单_2026-08-03-14-05-30-639.xlsx")) {
    const name = s(r["学生"]);
    let sid = studentNameToId[name];
    if (!sid) { const st = await prisma.student.findFirst({ where: { tenantId: TENANT_ID, name } }); if (st) { sid = st.id; studentNameToId[name] = sid; } }
    if (!sid) { console.warn(`  ⚠ 跳过回款:${name}`); continue; }
    await prisma.payment.create({ data: {
      tenantId: TENANT_ID, studentId: sid, paymentNo: s(r["回款编号"]) || `HK_${Date.now()}`,
      amount: money(r["本次收款"]), currency: "CNY",
      paymentType: s(r["款项类型"]).includes("全款") ? "FULL" : "DEPOSIT",
      method: s(r["支付方式"]) || null, remark: s(r["备注"]) || null,
      paidAt: dt(r["收款时间"]) || dt(r["创建时间(必填)"]) || new Date(),
    }}).then(() => ok(total, `HK:${name}`)).catch(e => {});
  }

  // 6. 退款 → Refund (7条)
  console.log("\n═══ 6/9 退款表单 → Refund ═══");
  for (const r of readExcel("退款表单_2026-08-03-14-05-56-326.xlsx")) {
    const name = s(r["学生"]);
    let sid = studentNameToId[name];
    if (!sid) { const st = await prisma.student.findFirst({ where: { tenantId: TENANT_ID, name } }); if (st) { sid = st.id; studentNameToId[name] = sid; } }
    if (!sid) continue;
    await prisma.refund.create({ data: {
      tenantId: TENANT_ID, studentId: sid, refundNo: s(r["回款编号"]) || `TK_${Date.now()}`,
      amount: money(r["本次退款"]), currency: "CNY",
      reason: s(r["退款原因"]) || null, method: s(r["退款方式"]) || null,
      refundAt: dt(r["退款时间"]) || new Date(), remark: s(r["备注"]) || null,
    }}).then(() => ok(total, `TK:${name}`)).catch(() => {});
  }

  // 7. 文案在办 → Application (20条)
  console.log("\n═══ 7/9 文案在办 → Application ═══");
  const appStatusMap = { "未递交": "PREPARING", "已递交": "SUBMITTED", "已录取": "OFFER_RECEIVED" };
  for (const r of readExcel("文案在办_2026-08-03-14-03-39-380.xlsx")) {
    const name = s(r["学生"]);
    let sid = studentNameToId[name];
    if (!sid) { const st = await prisma.student.findFirst({ where: { tenantId: TENANT_ID, name } }); if (st) { sid = st.id; studentNameToId[name] = sid; } }
    if (!sid) { console.warn(`  ⚠ 跳过文书:${name}`); continue; }
    await prisma.application.create({ data: {
      tenantId: TENANT_ID, studentId: sid, institutionName: s(r["已申请大学"]) || "待定",
      majorName: s(r["已申请专业"]) || "待定", degree: s(r["学历层次"]) || "硕士",
      intakeYear: new Date().getFullYear(), intakeMonth: 9,
      status: appStatusMap[s(r["递交状态"])] || "PREPARING",
      remark: `文书:${s(r["文书提交日"])}|进展:${s(r["进展"])}|文案:${s(r["文案老师"])}`,
    }}).then(() => ok(total, `App:${name}`)).catch(e => {});
  }

  // 8. 佣金 → Commission (20条)
  console.log("\n═══ 8/9 佣金表单 → Commission ═══");
  for (const r of readExcel("佣金表单_2026-08-03-14-06-45-469.xlsx")) {
    const name = s(r["学生"]);
    let sid = studentNameToId[name];
    if (!sid) { const st = await prisma.student.findFirst({ where: { tenantId: TENANT_ID, name } }); if (st) { sid = st.id; studentNameToId[name] = sid; } }
    if (!sid) continue;
    await prisma.commission.create({ data: {
      tenantId: TENANT_ID, studentId: sid, commissionNo: s(r["佣金编号"]) || `YJ_${Date.now()}`,
      amount: money(r["佣金金额"]), status: "RELEASED",
      releasedAt: dt(r["收取日期"]) || new Date(), remark: s(r["备注"]) || null,
    }}).then(() => ok(total, `YJ:${name}`)).catch(e => {});
  }

  // 最终统计
  const stats = {
    Partner: await prisma.partner.count({ where: { tenantId: TENANT_ID } }),
    Lead: await prisma.lead.count({ where: { tenantId: TENANT_ID } }),
    Student: await prisma.student.count({ where: { tenantId: TENANT_ID } }),
    Contract: await prisma.contract.count({ where: { tenantId: TENANT_ID } }),
    Payment: await prisma.payment.count({ where: { tenantId: TENANT_ID } }),
    Refund: await prisma.refund.count({ where: { tenantId: TENANT_ID } }),
    Application: await prisma.application.count({ where: { tenantId: TENANT_ID } }),
    Commission: await prisma.commission.count({ where: { tenantId: TENANT_ID } }),
  };
  console.log("\n═══════════════════════════╗");
  console.log("  🎉 导入完成               ║");
  console.log("═══════════════════════════╝");
  for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
  console.log(`  ────────────────`);
  console.log(`  总计: ${Object.values(stats).reduce((a, b) => a + b, 0)} 条`);
}

main().catch(e => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
