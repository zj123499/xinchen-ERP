#!/usr/bin/env python3
"""ETL 全量导入 — 映射驱动，批量写入，失败日志"""
import psycopg2, openpyxl, warnings, re, glob, os
from datetime import datetime
warnings.filterwarnings("ignore")

D = "/home/ubuntu/xinchen-erp/data-import"
DB = dict(host="127.0.0.1", port=5432, dbname="xinchen_erp", user="user_TJ4skN", password="password_6Jaz2n")
TID, BS, NOW = 1, 200, datetime.now()

# Utils
m = lambda v: float(str(v).replace(",", "")) if v else 0
def dt(v):
    if not v or not str(v).strip(): return None
    s = str(v).strip()
    for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y/%m/%d"]:
        try: return datetime.strptime(s[:len(fmt)], fmt)
        except: continue
    return None
ph = lambda v: re.sub(r"^\+86|^86", "", str(v).strip()).replace(" ", "")[:20] if v else ""
st = lambda v: str(v).strip() if v else ""

def read_xlsx(pattern):
    rows = []
    for fp in sorted(glob.glob(os.path.join(D, pattern))):
        wb = openpyxl.load_workbook(fp, data_only=True)
        ws = wb["Sheet1"]
        hd = [str(c.value or "").strip() for c in ws[2]]
        for row in ws.iter_rows(min_row=3, values_only=True):
            rec = {}
            for i, val in enumerate(row):
                if i < len(hd) and hd[i]:
                    rec[hd[i]] = str(val) if val is not None else ""
            if rec: rows.append(rec)
    return rows

def bulk_insert(cur, table, columns, records, on_conflict=None):
    if not records: return 0
    base = f'INSERT INTO {table} ({",".join(columns)}) VALUES ({",".join(["%s"]*len(columns))})'
    sql = base + f' ON CONFLICT ({on_conflict}) DO NOTHING' if on_conflict else base
    for i in range(0, len(records), BS):
        batch = records[i:i+BS]
        vals = [tuple(r.get(c) for c in columns) for r in batch]
        cur.executemany(sql, vals)
    return len(records)

conn = psycopg2.connect(**DB)
cur = conn.cursor()

# user lookup
users = {}
cur.execute("SELECT real_name, username, id FROM users WHERE tenant_id=%s AND is_active=true", (TID,))
for rn, un, uid in cur.fetchall():
    if rn: users[rn] = uid
    users[un] = uid

print("=" * 50)
print("  ETL 导入开始")
print("=" * 50)

results = {}

# =================== 1. Partners ===================
print("\n[1/8] B端渠道 → partners")
rows = read_xlsx("B端渠道_*.xlsx")
recs = []
for r in rows:
    n = st(r.get("渠道名称", ""))
    if not n: continue
    recs.append(dict(
        tenant_id=TID, name=n, type="agency",
        contact_name=st(r.get("对接人")) or None,
        contact_phone=ph(r.get("联系电话")) or None,
        status=True, created_at=NOW, updated_at=NOW,
    ))
n = bulk_insert(cur, "partners", list(recs[0].keys()) if recs else [], recs, on_conflict="refund_no")
results["partner"] = f"{n}/{len(rows)}条"
print(f"  写入 {n} 条")

# =================== 2. Leads ===================
print("[2/8] 线索类型 → leads")
rows = read_xlsx("线索类型_*.xlsx")
recs = []
src_enum = {"未跟进": "NEW", "已跟进": "CONTACTED", "无效": "INVALID"}
for r in rows:
    n = st(r.get("客户名称", r.get("数据标题", "")))
    if not n: continue
    src = st(r.get("线索类型", ""))
    sub = st(r.get("自媒体类型", ""))
    if sub: src = f"自媒体-{sub}" if src == "自媒体" else f"{src}-{sub}"
    status = src_enum.get(st(r.get("跟进状态", "")), "NEW")
    assign = users.get(st(r.get("拥有者(必填)", r.get("自媒体人员", ""))), 1)
    recs.append(dict(
        tenant_id=TID, name=n, phone=ph(r.get("客户手机号")) or "unknown",
        wechat=st(r.get("客户微信号")) or None,
        source=src or "IMPORT", source_detail=sub or None,
        status=status, assigned_to_id=assign,
        remark=st(r.get("备注")) or None,
        created_at=dt(r.get("创建时间")) or NOW, updated_at=NOW,
    ))
n = bulk_insert(cur, "leads", list(recs[0].keys()) if recs else [], recs, on_conflict="refund_no")
results["lead"] = f"{n}/{len(rows)}条"
print(f"  写入 {n} 条")

# =================== 3. Students ===================
print("[3/8] 意向学生 → students")
rows = read_xlsx("意向学生_*.xlsx")
recs, seen = [], set()
for r in rows:
    n = st(r.get("客户名称", ""))
    if not n or n in seen: continue
    seen.add(n)
    assign = users.get(st(r.get("拥有者(必填)", r.get("成交人(必填)", ""))), 1)
    recs.append(dict(
        tenant_id=TID, name=n, phone=ph(r.get("客户手机号")) or None,
        assigned_to_id=assign, current_status="LEAD",
        source=st(r.get("客户来源", "")) or "UNKNOWN",
        created_at=dt(r.get("创建时间")) or NOW, updated_at=NOW,
    ))
n = bulk_insert(cur, "students", list(recs[0].keys()) if recs else [], recs, on_conflict="refund_no")
results["student"] = f"{n}/{len(rows)}条"
print(f"  写入 {n} 条")

# =================== 4. Contracts ===================
print("[4/8] 已签约 → contracts")
# student name → id lookup
cur.execute("SELECT name, id FROM students WHERE tenant_id=%s", (TID,))
sid_map = {r[0]: r[1] for r in cur.fetchall()}
rows = read_xlsx("已签约_*.xlsx")
recs = []
for r in rows:
    sn = st(r.get("学生姓名", ""))
    sid = sid_map.get(sn)
    if not sid: continue
    amt = m(r.get("签约金额", ""))
    recs.append(dict(
        tenant_id=TID, student_id=sid,
        contract_no=st(r.get("数据标题")) or f"HT_{sn}",
        total_amount=amt, currency="CNY", status="SIGNED",
        sign_date=dt(r.get("签约时间")) or NOW,
        created_at=NOW, updated_at=NOW,
        remark=st(r.get("业务类型", "")) or None,
    ))
n = bulk_insert(cur, "contracts", list(recs[0].keys()) if recs else [], recs, on_conflict="contract_no")
results["contract"] = f"{n}/{len(rows)}条"
print(f"  写入 {n} 条")

# =================== 5. Payments ===================
print("[5/8] 回款表单 → payments")
rows = read_xlsx("回款表单_*.xlsx")
recs = []
for r in rows:
    sn = st(r.get("学生", ""))
    sid = sid_map.get(sn)
    if not sid:
        # try to find by name
        cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s", (TID, sn))
        row = cur.fetchone()
        if row: sid = row[0]
        else: continue
    amt = m(r.get("本次收款", ""))
    if amt <= 0: continue
    recs.append(dict(
        tenant_id=TID, student_id=sid,
        payment_no=st(r.get("回款编号")) or f"HK_{sn}",
        payment_type="CLIENT_FEE", amount=amt, currency="CNY",
        method="BANK_TRANSFER",
        paid_at=dt(r.get("收款时间")) or NOW,
        fiscal_year=NOW.year, fiscal_month=NOW.month,
        created_at=NOW,
    ))
n = bulk_insert(cur, "payments", list(recs[0].keys()) if recs else [], recs, on_conflict="refund_no")
results["payment"] = f"{n}/{len(rows)}条"
print(f"  写入 {n} 条")

# =================== 6. Refunds ===================
print("[6/8] 退款表单 → refunds")
rows = read_xlsx("退款表单_*.xlsx")
recs = []
for r in rows:
    sn = st(r.get("学生", ""))
    sid = sid_map.get(sn)
    if not sid:
        cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s", (TID, sn))
        row = cur.fetchone()
        if row: sid = row[0]
        else: continue
    amt = m(r.get("本次退款", ""))
    if amt <= 0: continue
    recs.append(dict(
        tenant_id=TID, student_id=sid,
        refund_no=st(r.get("回款编号")) or f"TK_{sn}",
        amount=amt, currency="CNY", status="PENDING",
        reason=st(r.get("退款原因")) or None,
        refunded_at=dt(r.get("退款时间")) or NOW,
        created_at=NOW, updated_at=NOW,
    ))
n = bulk_insert(cur, "refunds", list(recs[0].keys()) if recs else [], recs, on_conflict="refund_no")
results["refund"] = f"{n}/{len(rows)}条"
print(f"  写入 {n} 条")

# =================== 7. Applications ===================
print("[7/8] 文案在办 → applications")
rows = read_xlsx("文案在办_*.xlsx")
recs, app_seen = [], set()
ap_enum = {"未递交": "PREPARING", "已递交": "SUBMITTED", "已录取": "OFFER"}
for r in rows:
    sn = st(r.get("学生", ""))
    if not sn: continue
    sid = sid_map.get(sn)
    if not sid:
        cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s", (TID, sn))
        row = cur.fetchone()
        if row: sid = row[0]
        else: continue
    key = f"{sid}|{st(r.get('已申请大学',''))}|{st(r.get('已申请专业',''))}"
    if key in app_seen: continue
    app_seen.add(key)
    recs.append(dict(
        tenant_id=TID, student_id=sid,
        institution_name=st(r.get("已申请大学")) or "待定",
        major_name=st(r.get("已申请专业")) or "待定",
        degree=st(r.get("业务类型", r.get("学历层次"))) or "MS",
        intake_year=NOW.year, intake_month=9,
        status=ap_enum.get(st(r.get("递交状态", "")), "PREPARING"),
        remark=st(r.get("进展", "")) or None,
        created_at=NOW, updated_at=NOW,
    ))
n = bulk_insert(cur, "applications", list(recs[0].keys()) if recs else [], recs, on_conflict="refund_no")
results["application"] = f"{n}/{len(rows)}条"
print(f"  写入 {n} 条")

# =================== 8. Commissions ===================
print("[8/8] 佣金表单 → commissions")
# ensure rule exists
cur.execute("INSERT INTO commission_rules(id,tenant_id,name,version,rule_type,config,status,effective_from,created_at) VALUES(1,1,'默认规则',1,'FULL','{}',true,NOW(),NOW()) ON CONFLICT(id) DO NOTHING")
conn.commit()
rows = read_xlsx("佣金表单_*.xlsx")
recs = []
for r in rows:
    sn = st(r.get("学生", r.get("佣金管理", "")))
    if not sn: continue
    sid = sid_map.get(sn)
    if not sid:
        cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s", (TID, sn))
        row = cur.fetchone()
        if row: sid = row[0]
        else: continue
    amt = m(r.get("佣金金额", ""))
    if amt <= 0: continue
    recs.append(dict(
        tenant_id=TID, student_id=sid,
        rule_id=1, employee_id=1,
        amount=amt, status="RELEASED",
        fiscal_year=NOW.year, fiscal_month=NOW.month,
        released_at=dt(r.get("收取日期")) or NOW,
        created_at=NOW,
    ))
n = bulk_insert(cur, "commissions", list(recs[0].keys()) if recs else [], recs, on_conflict="refund_no")
results["commission"] = f"{n}/{len(rows)}条"
print(f"  写入 {n} 条")

conn.commit()

# =================== 验证报告 ===================
print("\n" + "=" * 50)
print("  导入完成 — 数据验证")
print("=" * 50)
total = 0
for t, label in [("partners", "渠道"), ("leads", "线索"), ("students", "学生"),
                  ("contracts", "合同"), ("payments", "回款"), ("refunds", "退款"),
                  ("applications", "申请"), ("commissions", "佣金")]:
    cur.execute(f"SELECT count(*) FROM {t} WHERE tenant_id=%s", (TID,))
    cnt = cur.fetchone()[0]
    total += cnt
    print(f"  {label:8s}: {cnt:>6}")

print(f"  {'TOTAL':8s}: {total:>6}")
print("\n详细: " + ", ".join(f"{k}={v}" for k, v in results.items()))
conn.close()
