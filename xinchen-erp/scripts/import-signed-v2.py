#!/usr/bin/env python3
import psycopg2,openpyxl,warnings,re
from datetime import datetime
warnings.filterwarnings("ignore")
conn=psycopg2.connect(host="127.0.0.1",port=5432,dbname="xinchen_erp",user="user_TJ4skN",password="password_6Jaz2n")
c=conn.cursor();TID=1
def rd(fn):
    wb=openpyxl.load_workbook(fn);ws=wb["Sheet1"]
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
    s=str(v).strip()
    try:return datetime.strptime(s[:19],"%Y-%m-%d %H:%M:%S")
    except:return datetime.strptime(s[:10],"%Y-%m-%d")
st=lambda v:str(v).strip() if v else ""
ph=lambda v:re.sub(r"^\+86|^86","",str(v).strip()) if v else ""
um={}
c.execute("SELECT id,real_name,username FROM users WHERE tenant_id=%s",(TID,))
for rid,rn,un in c.fetchall():
    if rn:um[rn]=rid
    um[un]=rid
def gsid(name,phone=""):
    name=st(name)
    if not name:return None
    c.execute("SELECT id FROM students WHERE tenant_id=%s AND name=%s",(TID,name))
    row=c.fetchone()
    if row:return row[0]
    c.execute("INSERT INTO students(tenant_id,name,phone,current_status,source,created_at,updated_at) VALUES(%s,%s,%s,'SIGNED','IMPORT',NOW(),NOW()) RETURNING id",(TID,name,ph(phone) or f"auto_{name}"))
    return c.fetchone()[0]
FF="/home/ubuntu/xinchen-erp/data-import/已签约_2026-08-03-15-31-32-158.xlsx"
rows=rd(FF)
print(f"Total: {len(rows)} rows\n")
total=0
for r in rows:
    name=st(r.get("学生姓名",""))
    if not name:continue
    sid=gsid(name,r.get("学生电话",""))
    rmk=[]
    if st(r.get("微信号","")):rmk.append(f"微信:{st(r.get('微信号',''))}")
    if st(r.get("学生备注","")):rmk.append(st(r.get("学生备注","")))
    advisor=um.get(st(r.get("咨询顾问","")),None)
    rmk_str=" | ".join(rmk) if rmk else None
    c.execute("UPDATE students SET phone=COALESCE(NULLIF(%s,''),phone),current_status='SIGNED',assigned_to_id=COALESCE(%s,assigned_to_id),source=COALESCE(NULLIF(%s,''),source),remark=CASE WHEN %s IS NOT NULL THEN CONCAT_WS(' | ',remark,%s) ELSE remark END,updated_at=NOW() WHERE id=%s",(ph(r.get("学生电话")),advisor,st(r.get("来源类型","")) or None,rmk_str,rmk_str,sid))
    amt=m(r.get("签约金额",""))
    if amt>0:
        try:c.execute("INSERT INTO contracts(tenant_id,student_id,contract_no,total_amount,sign_date,status,currency,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,'SIGNED','CNY',%s,NOW(),NOW()) ON CONFLICT DO NOTHING",(TID,sid,st(r.get("数据标题",r.get("学生姓名",""))) or f"HT_{name}",amt,dt(r.get("签约时间")) or dt(r.get("创建时间")),f"biz:{st(r.get('业务类型',''))}"))
        except:pass
    paid=m(r.get("留学已支付金额",""))
    if paid>0:
        try:c.execute("INSERT INTO payments(tenant_id,student_id,payment_no,amount,currency,payment_type,method,paid_at,fiscal_year,fiscal_month,created_at) VALUES(%s,%s,%s,%s,'CNY','CLIENT_FEE','BANK_TRANSFER',%s,%s,%s,NOW()) ON CONFLICT DO NOTHING",(TID,sid,f"HK_{name}_2",paid,dt(r.get("创建时间")) or datetime.now(),datetime.now().year,datetime.now().month))
        except:pass
    refund=m(r.get("留学已退款金额",""))
    if refund>0:
        try:c.execute("INSERT INTO refunds(tenant_id,student_id,refund_no,amount,currency,reason,status,refunded_at,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,'CNY',%s,'PENDING',NOW(),%s,NOW(),NOW()) ON CONFLICT DO NOTHING",(TID,sid,f"TK_{name}",refund,"refunded",st(r.get("备注","")) or None))
        except:pass
    comm=m(r.get("已收取佣金",""))
    if comm>0:
        try:c.execute("INSERT INTO commissions(tenant_id,student_id,rule_id,employee_id,amount,status,fiscal_year,fiscal_month,released_at,created_at) VALUES(%s,%s,1,29,%s,'RELEASED',%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING",(TID,sid,comm,datetime.now().year,datetime.now().month))
        except:pass
    inst=st(r.get("申请信息.申请院校",""))
    if inst:
        stat="SUBMITTED" if st(r.get("申请信息.入学状态",""))=="已入" else "PREPARING"
        try:c.execute("INSERT INTO applications(tenant_id,student_id,institution_name,major_name,degree,intake_year,intake_month,status,remark,created_at,updated_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW()) ON CONFLICT DO NOTHING",(TID,sid,inst,st(r.get("申请信息.申请专业","")) or "待定",st(r.get("业务类型","")) or "MS",datetime.now().year,9,stat,f"country:{st(r.get('申请信息.申请国家',''))}"))
        except:pass
    total+=1
    if total%100==0:
        conn.commit()
        print(f"  [{total}/{len(rows)}]")
conn.commit()
print(f"\nDone: {total} rows")
for t in ["students","contracts","payments","refunds","commissions","applications"]:
    c.execute(f"SELECT count(*) FROM {t} WHERE tenant_id=%s",(TID,))
    print(f"  {t}: {c.fetchone()[0]}")
conn.close()
