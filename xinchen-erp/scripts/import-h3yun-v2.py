#!/usr/bin/env python3
"""氚云数据导入 v2 — 自动创建缺失Student，完整导入"""
import psycopg2, openpyxl, warnings, re
from datetime import datetime
warnings.filterwarnings("ignore")
conn=psycopg2.connect(host="127.0.0.1",port=5432,dbname="xinchen_erp",user="user_TJ4skN",password="password_6Jaz2n")
cur=conn.cursor(); TID=1; DD="/home/ubuntu/xinchen-erp/data-import"

def rdx(fn):
    wb=openpyxl.load_workbook(f"{DD}/{fn}"); ws=wb['Sheet1']
    hd=[str(c.value or "").strip() for c in ws[2]]
    rr=[]
    for row in ws.iter_rows(min_row=3,values_only=True):
        d={}
        for i,v in enumerate(row):
            if i<len(hd) and hd[i]: d[hd[i]]=str(v) if v is not None else ""
        if d: rr.append(d)
    return rr

m=lambda v:float(str(v).replace(",","")) if v else 0
def dt(v):
    if not v or not str(v).strip(): return None
    s=str(v).strip()
    try: return datetime.strptime(s[:19],"%Y-%m-%d %H:%M:%S")
    except: return datetime.strptime(s[:10],"%Y-%m-%d")
s=lambda v:str(v).strip() if v else ""
ph=lambda v:re.sub(r"^\+86|^86","",str(v).strip()) if v else ""

# 用户映射
um={}
cur.execute("SELECT id,real_name,username FROM users WHERE tenant_id=%s",(TID,))
for rid,rn,un in cur.fetchall():
    if rn: um[rn]=rid
    um[un]=rid
print(f"👤 用户映射: {len(um)}人")

# 学生映射(持久化到DB查询)
def get_or_create_student(name, phone="", source=None):
    """按名查找Student，不存在则创建"""
    name=s(name)
    if not name: return None
    cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s",(TID,name))
    row=cur.fetchone()
    if row: return row[0]
    cur.execute("""INSERT INTO students(tenant_id,name,phone,current_status,source,created_at,updated_at)
        VALUES(%s,%s,%s,%s,%s,NOW(),NOW()) RETURNING id""",
        (TID,name,ph(phone) or f"auto_{name}","LEAD",source or "IMPORT"))
    return cur.fetchone()[0]

total=0
def log(label, msg=""): global total; total+=1; print(f"  [{total}] {label}: {msg}")

# ═══════════════════════════════════════
# 1. Partner
# ═══════════════════════════════════════
print("\n═══1/8 Partner═══")
for r in rdx("B端渠道_2026-08-03-14-03-06-844.xlsx"):
    n=s(r.get("渠道名称","")); 
    if not n: continue
    cur.execute("""INSERT INTO partners(tenant_id,name,type,contact_name,contact_phone,contract_url,status,created_at,updated_at)
        VALUES(%s,%s,%s,%s,%s,%s,true,NOW(),NOW()) ON CONFLICT DO NOTHING""",
        (TID,n,"agency",s(r.get("对接人")) or None,ph(r.get("联系电话")) or None,
         f"来源:{s(r.get('来源',''))}|签约:{s(r.get('签约状态',''))}"))
    log("Partner",n)
conn.commit()

# ═══════════════════════════════════════
# 2. Lead
# ═══════════════════════════════════════
print("\n═══2/8 Lead═══")
ls={"未跟进":"NEW","已跟进":"CONTACTED"}
for r in rdx("线索类型_2026-08-03-14-05-03-339.xlsx"):
    n=s(r.get("客户名称",r.get("数据标题","")))
    if not n: continue
    sub=s(r.get("自媒体类型",""))
    fs=f"自媒体-{sub}" if sub else s(r.get("线索类型",""))
    st=ls.get(s(r.get("跟进状态","")),"NEW")
    rmk=[]
    if s(r.get("备注","")): rmk.append(f"咨询:{s(r['备注'])[:500]}")
    if s(r.get("客户微信号","")): rmk.append(f"微信:{s(r['客户微信号'])}")
    if s(r.get("营销状态","")): rmk.append(f"营销:{s(r['营销状态'])}")
    if r.get("是否转客户")=="是": rmk.append("【已转客户】")
    owner=s(r.get("自媒体人员",r.get("拥有者(必填)","")))
    cur.execute("""INSERT INTO leads(tenant_id,name,phone,wechat,source,source_detail,status,remark,assigned_to_id,created_at,updated_at)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) ON CONFLICT DO NOTHING""",
        (TID,n,ph(r.get("客户手机号")) or f"lead_{n}",s(r.get("客户微信号")) or None,fs,sub or None,st,
         " | ".join(rmk) if rmk else None,um.get(owner,1),dt(r.get("创建时间")) or datetime.now()))
    log("Lead",n)
conn.commit()

# ═══════════════════════════════════════
# 3. 意向学生 → Student (意向)
# ═══════════════════════════════════════
print("\n═══3/8 意向学生═══")
for r in rdx("意向学生_2026-08-03-14-04-05-633.xlsx"):
    n=s(r.get("客户名称",""))
    if not n: continue
    rmk=[]
    if s(r.get("备注","")): rmk.append(f"咨询:{s(r['备注'])[:300]}")
    if s(r.get("微信号","")): rmk.append(f"微信:{s(r['微信号'])}")
    sid=get_or_create_student(n,r.get("客户手机号"))
    if sid:
        cur.execute("""UPDATE students SET current_status='LEAD',target_country=%s,assigned_to_id=%s,
            remark=%s,updated_at=NOW() WHERE id=%s""",
            (s(r.get("申请国别")) or None,um.get(s(r.get("成交人(必填)")),1),
             " | ".join(rmk) if rmk else None,sid))
    log("Student",f"{n} id={sid}")
conn.commit()

# ═══════════════════════════════════════
# 4. 已签约 → Contract
# ═══════════════════════════════════════
print("\n═══4/8 已签约═══")
for r in rdx("已签约_2026-08-03-14-02-37-502.xlsx"):
    n=s(r.get("学生姓名",""))
    if not n: continue
    sid=get_or_create_student(n,r.get("电话"))
    # 更新Student为签约状态
    cur.execute("""UPDATE students SET current_status='SIGNED',current_school=%s,target_country=%s,
        assigned_to_id=COALESCE(%s,assigned_to_id),source=COALESCE(%s,source),
        remark=CONCAT_WS(' | ',remark,%s),updated_at=NOW() WHERE id=%s""",
        (s(r.get("所在大学")) or None,s(r.get("申请国别")) or None,
         um.get(s(r.get("成交老师")),None),s(r.get("渠道来源")) or None,
         s(r.get("备注")) or None,sid))
    # 创建Contract
    cur.execute("""INSERT INTO contracts(tenant_id,student_id,contract_no,total_amount,discount_rate,
        sign_date,status,currency,remark,created_at,updated_at)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING""",
        (TID,sid,s(r.get("回款编号")) or f"HT_{n}",m(r.get("成交金额")) or m(r.get("首款金额")) or 0,
         float(r["折扣"]) if r.get("折扣") else None,dt(r.get("签约时间")),"SIGNED","CNY",
         f"渠道:{s(r.get('渠道来源',''))}|方式:{s(r.get('签约方式',''))}"))
    log("Contract",f"{n} ¥{m(r.get('成交金额')):.0f}")
conn.commit()

# ═══════════════════════════════════════
# 5. 回款 → Payment (自动创建缺失Student)
# ═══════════════════════════════════════
print("\n═══5/8 回款表单═══")
for r in rdx("回款表单_2026-08-03-14-05-30-639.xlsx"):
    n=s(r.get("学生",""))
    if not n: continue
    sid=get_or_create_student(n)
    cur.execute("""INSERT INTO payments(tenant_id,student_id,payment_no,amount,currency,
        payment_type,method,remark,paid_at,fiscal_year,fiscal_month,created_at)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) ON CONFLICT DO NOTHING""",
        (TID,sid,s(r.get("回款编号")) or f"HK_{n}",m(r.get("本次收款")),"CNY",
         "CLIENT_FEE" if "全款" in s(r.get("款项类型","")) else "CLIENT_FEE",
         "BANK_TRANSFER",s(r.get("备注")) or None,
         dt(r.get("收款时间")) or dt(r.get("创建时间(必填)")) or datetime.now(),
         datetime.now().year,datetime.now().month))
    log("Payment",f"{n} ¥{m(r.get('本次收款')):.0f}")
conn.commit()

# ═══════════════════════════════════════
# 6. 退款 → Refund
# ═══════════════════════════════════════
print("\n═══6/8 退款表单═══")
for r in rdx("退款表单_2026-08-03-14-05-56-326.xlsx"):
    n=s(r.get("学生",""))
    if not n: continue
    sid=get_or_create_student(n)
    cur.execute("""INSERT INTO refunds(tenant_id,student_id,refund_no,amount,currency,
        reason,status,refunded_at,remark,created_at,updated_at)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING""",
        (TID,sid,s(r.get("回款编号")) or f"TK_{n}",m(r.get("本次退款")),"CNY",
         s(r.get("退款原因")) or None,"PENDING",dt(r.get("退款时间")) or datetime.now(),
         s(r.get("备注")) or None))
    log("Refund",f"{n} ¥{m(r.get('本次退款')):.0f}")
conn.commit()

# ═══════════════════════════════════════
# 7. 文案在办 → Application
# ═══════════════════════════════════════
print("\n═══7/8 文案在办═══")
ap={"未递交":"PREPARING","已递交":"SUBMITTED","已录取":"OFFER"}
for r in rdx("文案在办_2026-08-03-14-03-39-380.xlsx"):
    n=s(r.get("学生",""))
    if not n: continue
    sid=get_or_create_student(n)
    cur.execute("""INSERT INTO applications(tenant_id,student_id,institution_name,major_name,degree,
        intake_year,intake_month,status,remark,created_at,updated_at)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING""",
        (TID,sid,s(r.get("已申请大学")) or "待定",s(r.get("已申请专业")) or "待定",
         s(r.get("学历层次") or r.get("业务类型")) or "硕士",datetime.now().year,9,
         ap.get(s(r.get("递交状态","")),"PREPARING"),
         f"文书日:{s(r.get('文书提交日',''))}|进展:{s(r.get('进展',''))}|文案:{s(r.get('文案老师',''))}"))
    log("Application",f"{n}→{s(r.get('已申请大学','待定'))}")
conn.commit()

# ═══════════════════════════════════════
# 8. 佣金
# ═══════════════════════════════════════
print("\n═══8/8 佣金表单═══")
for r in rdx("佣金表单_2026-08-03-14-06-45-469.xlsx"):
    n=s(r.get("学生",r.get("佣金管理","")))
    if not n: continue
    sid=get_or_create_student(n)
    cur.execute("""INSERT INTO commissions(tenant_id,student_id,rule_id,employee_id,amount,status,fiscal_year,fiscal_month,released_at,created_at)
        VALUES(%s,%s,1,1,%s,%s,%s,%s,%s,NOW()) ON CONFLICT DO NOTHING""",
        (TID,sid,m(r.get("佣金金额")),"RELEASED",datetime.now().year,datetime.now().month,dt(r.get("收取日期")) or datetime.now()))
    log("Commission",f"{n} ¥{m(r.get('佣金金额')):.2f}")
conn.commit()

# ═══════════════════════════════════════
# 统计
# ═══════════════════════════════════════
print("\n══════════════════════╗")
print("  🎉 导入完成!         ║")
print("══════════════════════╝")
for t in ["partners","leads","students","contracts","payments","refunds","applications","commissions"]:
    cur.execute(f"SELECT count(*) FROM {t} WHERE tenant_id=%s",(TID,))
    c=cur.fetchone()[0]
    print(f"  {t}: {c}")
print(f"  ────────────────────")
cur.execute("""SELECT count(*) FROM (SELECT id FROM partners WHERE tenant_id=%s
    UNION ALL SELECT id FROM leads WHERE tenant_id=%s
    UNION ALL SELECT id FROM students WHERE tenant_id=%s
    UNION ALL SELECT id FROM contracts WHERE tenant_id=%s
    UNION ALL SELECT id FROM payments WHERE tenant_id=%s
    UNION ALL SELECT id FROM refunds WHERE tenant_id=%s
    UNION ALL SELECT id FROM applications WHERE tenant_id=%s
    UNION ALL SELECT id FROM commissions WHERE tenant_id=%s) t""",(TID,TID,TID,TID,TID,TID,TID,TID))
print(f"  总计: {cur.fetchone()[0]} 条")
conn.close()
