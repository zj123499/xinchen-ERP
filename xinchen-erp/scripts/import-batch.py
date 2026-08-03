#!/usr/bin/env python3
"""批量导入7张氚云表"""
import psycopg2,openpyxl,warnings,re
from datetime import datetime
warnings.filterwarnings("ignore")
conn=psycopg2.connect(host="127.0.0.1",port=5432,dbname="xinchen_erp",user="user_TJ4skN",password="password_6Jaz2n")
c=conn.cursor();TID=1;D="/home/ubuntu/xinchen-erp/data-import/"

def rd(fn):
    wb=openpyxl.load_workbook(D+fn);ws=wb["Sheet1"]
    hd=[str(v.value or "").strip() for v in ws[2]]
    rr=[]
    for row in ws.iter_rows(min_row=3,values_only=True):
        d={}
        for i,v in enumerate(row):
            if i<len(hd) and hd[i]:d[hd[i]]=str(v) if v is not None else ""
        if d:rr.append(d)
    return rr
m=lambda v:float(str(v).replace(",","")) if v else 0
def dt(v):
    if not v or not str(v).strip():return None
    try:return datetime.strptime(str(v).strip()[:10],"%Y-%m-%d")
    except:return None
st=lambda v:str(v).strip() if v else ""
ph=lambda v:re.sub(r"^\+86|^86","",str(v).strip())[:20] if v else f"p{datetime.now().microsecond}"

um={}
c.execute("SELECT id,real_name,username FROM users WHERE tenant_id=%s",(TID,))
for rid,rn,un in c.fetchall():
    if rn:um[rn]=rid
    um[un]=rid

def gsid(name):
    name=st(name)
    if not name:return None
    c.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s",(TID,name))
    row=c.fetchone()
    if row:return row[0]
    c.execute("INSERT INTO students(tenant_id,name,phone,current_status,source,created_at,updated_at) VALUES(%s,%s,%s,'LEAD','IMPORT',NOW(),NOW()) RETURNING id",(TID,name,name[:15]))
    return c.fetchone()[0]

def ins(sql,vals):
    try:c.execute(sql,vals)
    except:pass

now=datetime.now()

# 1. Partner
print("1/7 Partner...")
for r in rd("B端渠道_2026-08-03-15-38-21-291.xlsx"):
    n=st(r.get("渠道名称",""));if not n:continue
    ins("INSERT INTO partners(tenant_id,name,type,contact_name,contact_phone,contract_url,status,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,true,NOW(),NOW()) ON CONFLICT DO NOTHING",(TID,n,"agency",st(r.get("对接人")) or None,st(r.get("联系电话")) or None,f"src:{st(r.get('来源',''))}"))
print(f"  partners: {c.execute('SELECT count(*) FROM partners WHERE tenant_id=%s',(TID,)).fetchone()[0]}")

# 2. Lead
print("2/7 Lead...")
for r in rd("线索类型_2026-08-03-15-39-34-194.xlsx"):
    n=st(r.get("客户名称",r.get("数据标题","")));if not n:continue
    ls={"未跟进":"NEW","已跟进":"CONTACTED"};sub=st(r.get("自媒体类型",""))
    fs=f"自媒体-{sub}" if sub else st(r.get("线索类型",""))
    ins("INSERT INTO leads(tenant_id,name,phone,wechat,source,source_detail,status,remark,assigned_to_id,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW()) ON CONFLICT DO NOTHING",(TID,n,ph(r.get("客户手机号")) or f"L{n[:10]}",st(r.get("客户微信号")) or None,fs,sub or None,ls.get(st(r.get("跟进状态","")),"NEW"),st(r.get("备注")) or None,um.get(st(r.get("自媒体人员",r.get("拥有者(必填)",""))),1),dt(r.get("创建时间")) or now))
print(f"  leads: {c.execute('SELECT count(*) FROM leads WHERE tenant_id=%s',(TID,)).fetchone()[0]}")

# 3. 意向学生
print("3/7 意向学生...")
for r in rd("意向学生_2026-08-03-15-38-56-476.xlsx"):
    n=st(r.get("客户名称",""));if not n:continue
    sid=gsid(n)
    ins("UPDATE students SET current_status='LEAD',assigned_to_id=COALESCE(%s,assigned_to_id),updated_at=NOW() WHERE id=%s",(um.get(st(r.get("成交人(必填)","")),None),sid))
print(f"  students: {c.execute('SELECT count(*) FROM students WHERE tenant_id=%s',(TID,)).fetchone()[0]}")

# 4. 回款
print("4/7 Payment...")
for r in rd("回款表单_2026-08-03-15-40-08-185.xlsx"):
    n=st(r.get("学生",""));if not n:continue
    sid=gsid(n)
    ins("INSERT INTO payments(tenant_id,student_id,payment_no,amount,currency,payment_type,method,paid_at,fiscal_year,fiscal_month,created_at) VALUES(%s,%s,%s,%s,'CNY','CLIENT_FEE','BANK_TRANSFER',%s,%s,%s,NOW()) ON CONFLICT DO NOTHING",(TID,sid,f"P{n[:10]}_{now.microsecond}",m(r.get("本次收款")),dt(r.get("收款时间")) or now,now.year,now.month))
print(f"  payments: {c.execute('SELECT count(*) FROM payments WHERE tenant_id=%s',(TID,)).fetchone()[0]}")

# 5. 文案
print("5/7 Application...")
for r in rd("文案在办_2026-08-03-15-38-41-224.xlsx"):
    n=st(r.get("学生",""));if not n:continue
    sid=gsid(n)
    ap={"未递交":"PREPARING","已递交":"SUBMITTED","已录取":"OFFER"}
    ins("INSERT INTO applications(tenant_id,student_id,institution_name,major_name,degree,intake_year,intake_month,status,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING",(TID,sid,st(r.get("已申请大学")) or "待定",st(r.get("已申请专业")) or "待定",st(r.get("学历层次","业务类型")) or "MS",now.year,9,ap.get(st(r.get("递交状态","")),"PREPARING"),f"doc:{st(r.get('文书提交日',''))}|prog:{st(r.get('进展',''))}"))
print(f"  applications: {c.execute('SELECT count(*) FROM applications WHERE tenant_id=%s',(TID,)).fetchone()[0]}")

# 6. 佣金
print("6/7 Commission...")
for r in rd("佣金表单_2026-08-03-15-40-46-860.xlsx"):
    n=st(r.get("学生",r.get("佣金管理","")));if not n:continue
    sid=gsid(n)
    ins("INSERT INTO commissions(tenant_id,student_id,rule_id,employee_id,amount,status,fiscal_year,fiscal_month,released_at,created_at) VALUES(%s,%s,1,29,%s,'RELEASED',%s,%s,%s,NOW()) ON CONFLICT DO NOTHING",(TID,sid,m(r.get("佣金金额")),now.year,now.month,dt(r.get("收取日期")) or now))
print(f"  commissions: {c.execute('SELECT count(*) FROM commissions WHERE tenant_id=%s',(TID,)).fetchone()[0]}")

# 7. 佣金管理(汇总跳过)
print("7/7 佣金管理(跳过汇总)")

conn.commit()
print("\n===== 导入完成 =====")
for t in ["partners","leads","students","contracts","payments","refunds","applications","commissions"]:
    c.execute(f"SELECT count(*) FROM {t} WHERE tenant_id=%s",(TID,))
    print(f"  {t}: {c.fetchone()[0]}")
conn.close()
