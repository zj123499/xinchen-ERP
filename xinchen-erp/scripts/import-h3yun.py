#!/usr/bin/env python3
"""氚云数据导入 — 匹配实际数据库schema"""
import psycopg2, openpyxl, warnings, re
from datetime import datetime
warnings.filterwarnings("ignore")
conn = psycopg2.connect(host="127.0.0.1",port=5432,dbname="xinchen_erp",user="user_TJ4skN",password="password_6Jaz2n")
cur = conn.cursor()
TID = 1
DD = "/home/ubuntu/xinchen-erp/data-import"

def rdx(fn):
    wb=openpyxl.load_workbook(f"{DD}/{fn}"); ws=wb['Sheet1']
    hd=[str(c.value or "").strip() for c in ws[2]]
    rr=[]
    for row in ws.iter_rows(min_row=3,values_only=True):
        d={}
        for i,v in enumerate(row):
            if i<len(hd) and hd[i]: d[hd[i]]=str(v) if v is not None else ""
        if d: rr.append(d)
    return rr,hd

m=lambda v:float(str(v).replace(",","")) if v else 0
def dt(v):
    if not v or not str(v).strip(): return None
    s=str(v).strip()
    try: return datetime.strptime(s[:19],"%Y-%m-%d %H:%M:%S")
    except: return datetime.strptime(s[:10],"%Y-%m-%d")
s=lambda v:str(v).strip() if v else ""
ph=lambda v:re.sub(r"^\+86|^86","",str(v).strip()) if v else ""

um={}
cur.execute("SELECT id,real_name,username FROM users WHERE tenant_id=%s",(TID,))
for rid,rn,un in cur.fetchall():
    if rn: um[rn]=rid
    um[un]=rid
print(f"用户映射:{len(um)}")

sm={}; total=0
def log(msg, extra=""):
    global total; total+=1; print(f"  [{total}] {msg}{extra}")

# 1. Partner
print("\n═══1/9 B端渠道═══")
rows,_=rdx("B端渠道_2026-08-03-14-03-06-844.xlsx")
for r in rows:
    n=s(r.get("渠道名称","")); 
    if not n: continue
    cur.execute("INSERT INTO partners(tenant_id,name,type,contact_name,contact_phone,contract_url,status,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING",
        (TID,n,"agency",s(r.get("对接人")) or None,ph(r.get("联系电话")) or None,
         f"来源:{s(r.get('来源',''))}|签约:{s(r.get('签约状态',''))}", True))
    log(f"Partner:{n}")

# 2. Lead
print("\n═══2/9 线索类型═══")
rows,_=rdx("线索类型_2026-08-03-14-05-03-339.xlsx")
ls={"未跟进":"NEW","已跟进":"CONTACTED"}
for r in rows:
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
    cur.execute("INSERT INTO leads(tenant_id,name,phone,wechat,source,source_detail,status,remark,assigned_to_id,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) ON CONFLICT DO NOTHING",
        (TID,n,ph(r.get("客户手机号")) or f"lead_{n}",s(r.get("客户微信号")) or None,fs,sub or None,st,
         " | ".join(rmk) if rmk else None,um.get(owner,1),dt(r.get("创建时间")) or datetime.now()))
    log(f"Lead:{n}")

# 3. 意向学生
print("\n═══3/9 意向学生═══")
rows,_=rdx("意向学生_2026-08-03-14-04-05-633.xlsx")
for r in rows:
    n=s(r.get("客户名称","")); 
    if not n: continue
    rmk=[]; 
    if s(r.get("备注","")): rmk.append(f"咨询:{s(r['备注'])[:300]}")
    if s(r.get("微信号","")): rmk.append(f"微信:{s(r['微信号'])}")
    cur.execute("INSERT INTO students(tenant_id,name,phone,current_status,assigned_to_id,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,NOW(),NOW()) RETURNING id",
        (TID,n,ph(r.get("客户手机号")) or f"stu_{n}","LEAD",um.get(s(r.get("成交人(必填)","")),1),
         " | ".join(rmk) if rmk else None))
    sid=cur.fetchone()[0]; sm[n]=sid; log(f"Student:{n}")

# 4. 已签约
print("\n═══4/9 已签约═══")
rows,_=rdx("已签约_2026-08-03-14-02-37-502.xlsx")
for r in rows:
    n=s(r.get("学生姓名","")); 
    if not n: continue
    sid=sm.get(n)
    if not sid:
        cur.execute("INSERT INTO students(tenant_id,name,phone,current_status,current_school,target_country,assigned_to_id,source,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) RETURNING id",
            (TID,n,ph(r.get("电话")) or f"signed_{n}","SIGNED",s(r.get("所在大学")) or None,s(r.get("申请国别")) or None,
             um.get(s(r.get("成交老师")),1),s(r.get("渠道来源")) or None,s(r.get("备注")) or None))
        sid=cur.fetchone()[0]; sm[n]=sid; log(f"+Student:{n}")
    cur.execute("INSERT INTO contracts(tenant_id,student_id,contract_no,total_amount,discount_rate,sign_date,status,currency,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING",
        (TID,sid,s(r.get("回款编号")) or f"HT_{n}",m(r.get("成交金额")) or m(r.get("首款金额")) or 0,
         float(r["折扣"]) if r.get("折扣") else None,dt(r.get("签约时间")),"SIGNED","CNY",
         f"渠道:{s(r.get('渠道来源',''))}|方式:{s(r.get('签约方式',''))}"))
    log(f"Contract:{n}")

# 5. 回款
print("\n═══5/9 回款表单═══")
rows,_=rdx("回款表单_2026-08-03-14-05-30-639.xlsx")
for r in rows:
    n=s(r.get("学生","")); 
    if not n: continue
    sid=sm.get(n)
    if not sid:
        cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s",(TID,n))
        row=cur.fetchone()
        if row: sid=row[0]; sm[n]=sid
        else: print(f"  ⚠跳过回款(无Student):{n}"); continue
    cur.execute("INSERT INTO payments(tenant_id,student_id,payment_no,amount,currency,payment_type,method,remark,paid_at,created_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) ON CONFLICT DO NOTHING",
        (TID,sid,s(r.get("回款编号")) or f"HK_{n}",m(r.get("本次收款")),"CNY",
         "FULL" if "全款" in s(r.get("款项类型","")) else "DEPOSIT",
         s(r.get("支付方式")) or None,s(r.get("备注")) or None,
         dt(r.get("收款时间")) or dt(r.get("创建时间(必填)")) or datetime.now()))
    log(f"Payment:{n} ¥{m(r.get('本次收款')):.0f}")

# 6. 退款
print("\n═══6/9 退款表单═══")
rows,_=rdx("退款表单_2026-08-03-14-05-56-326.xlsx")
for r in rows:
    n=s(r.get("学生","")); 
    if not n: continue
    sid=sm.get(n)
    if not sid:
        cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s",(TID,n))
        row=cur.fetchone()
        if row: sid=row[0]
        else: continue
    cur.execute("INSERT INTO refunds(tenant_id,student_id,refund_no,amount,currency,reason,refunded_at,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING",
        (TID,sid,s(r.get("回款编号")) or f"TK_{n}",m(r.get("本次退款")),"CNY",
         s(r.get("退款原因")) or None,dt(r.get("退款时间")) or datetime.now(),s(r.get("备注")) or None))
    log(f"Refund:{n} ¥{m(r.get('本次退款')):.0f}")

# 7. 文书
print("\n═══7/9 文案在办═══")
ap={"未递交":"PREPARING","已递交":"SUBMITTED","已录取":"OFFER_RECEIVED"}
rows,_=rdx("文案在办_2026-08-03-14-03-39-380.xlsx")
for r in rows:
    n=s(r.get("学生","")); 
    if not n: continue
    sid=sm.get(n)
    if not sid:
        cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s",(TID,n))
        row=cur.fetchone()
        if row: sid=row[0]
        else: print(f"  ⚠跳过文书(无Student):{n}"); continue
    cur.execute("INSERT INTO applications(tenant_id,student_id,institution_name,major_name,degree,intake_year,intake_month,status,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING",
        (TID,sid,s(r.get("已申请大学")) or "待定",s(r.get("已申请专业")) or "待定",
         s(r.get("学历层次") or r.get("业务类型")) or "硕士",datetime.now().year,9,
         ap.get(s(r.get("递交状态","")),"PREPARING"),
         f"文书日:{s(r.get('文书提交日',''))}|进展:{s(r.get('进展',''))}|文案:{s(r.get('文案老师',''))}"))
    log(f"App:{n}→{s(r.get('已申请大学','待定'))}")

# 8. 佣金
print("\n═══8/9 佣金表单═══")
rows,_=rdx("佣金表单_2026-08-03-14-06-45-469.xlsx")
for r in rows:
    n=s(r.get("学生",r.get("佣金管理",""))); 
    if not n: continue
    sid=sm.get(n)
    if not sid:
        cur.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s",(TID,n))
        row=cur.fetchone()
        if row: sid=row[0]
        else: continue
    cur.execute("INSERT INTO commissions(tenant_id,student_id,amount,status,released_at,created_at) VALUES(%s,%s,%s,%s,%s,NOW()) ON CONFLICT DO NOTHING",
        (TID,sid,m(r.get("佣金金额")),"RELEASED",dt(r.get("收取日期")) or datetime.now()))
    log(f"Comm:{n} ¥{m(r.get('佣金金额')):.2f}")

conn.commit()
print("\n══════════════╗")
print("  🎉 导入完成!  ║")
print("══════════════╝")
for t in ["partners","leads","students","contracts","payments","refunds","applications","commissions"]:
    cur.execute(f"SELECT count(*) FROM {t} WHERE tenant_id=%s",(TID,))
    print(f"  {t}: {cur.fetchone()[0]}")
conn.close()
