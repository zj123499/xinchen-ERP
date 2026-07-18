#!/usr/bin/env python3
"""
数据完整性验证 & 系统运行监控
"""
import requests, json
from datetime import datetime

BASE = 'http://111.229.72.128:8080'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoiYWRtaW4iLCJpYXQiOjE3ODQwOTY0MzQsImV4cCI6MzMzNDE2OTY0MzR9.XK2f4Wl-nD-U5neYR12ln77PAFilhWUvfvPths1Ov5Q'
H = {'Authorization': f'Bearer {TOKEN}'}

def get_count(table, filter_str=''):
    r = requests.get(f'{BASE}/api/{table}:list?pageSize=1&{filter_str}', headers=H, timeout=10)
    if r.status_code == 200:
        return r.json().get('meta', {}).get('count', 0)
    return f'ERR:{r.status_code}'

print('=' * 70)
print('🔍 数据完整性验证报告')
print(f'  时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
print('=' * 70)

# 1. 各表数据量
print('\n📊 各表数据量:')
tables = {
    'partners': '合作方管理', 'sites': '站群管理', 'leads': '线索录入',
    'follow_ups': '顾问跟进', 'copywriter_clients': '文书客户', 'contracts': '合同管理',
    'application_follow': '申请跟进', 'rental_orders': '租房订单', 'overseas_services': '境外服务',
    'media_accounts': '新媒体账号', 'media_performance': '新媒体业绩',
    'employees': '员工信息', 'salaries': '薪资管理', 'commissions': '提成明细'
}
total = 0
for table, name in tables.items():
    cnt = get_count(table)
    if isinstance(cnt, int):
        total += cnt
    print(f'  {name:　<8} ({table:　<22}): {cnt} 条')
print(f'  合计: {total} 条数据')

# 2. 按部门统计线索
print('\n📊 线索按来源渠道分布:')
sources = ['抖音', '视频号', '公众号', '小红书', '知乎', '今日头条', '口碑介绍', '合作方', '站群', 'GEO', '直播']
for s in sources:
    cnt = get_count('leads', f'filter[source]={s}')
    dept = ''
    if s in ['抖音', '视频号', '公众号', '小红书', '知乎', '今日头条']:
        dept = '【新媒体】'
    elif s in ['合作方', '直播']:
        dept = '【市场】'
    elif s in ['口碑介绍', 'GEO']:
        dept = '【顾问】'
    elif s == '站群':
        dept = '【站群】'
    print(f'  {dept} {s}: {cnt} 条')

# 3. 按业务方向统计
print('\n📊 线索按业务方向分布:')
for bt in ['留学', '租房', '境外服务']:
    cnt = get_count('leads', f'filter[business_type]={bt}')
    print(f'  {bt}: {cnt} 条')

# 4. 按归属顾问统计
print('\n📊 线索按归属顾问分布:')
consultants = {'赵杰': 3, '吴雪娇': 4, '张楠': 5, '姚静': 6, '邱枫': 7}
for name, uid in consultants.items():
    cnt = get_count('leads', f'filter[assigned_to][id]={uid}')
    print(f'  {name}: {cnt} 条')

# 5. 合同统计
print('\n📊 合同统计:')
for dt in ['留学', '租房', '境外服务']:
    cnt = get_count('contracts', f'filter[deal_type]={dt}')
    if isinstance(cnt, int) and cnt > 0:
        # 计算总金额
        r = requests.get(f'{BASE}/api/contracts:list?pageSize=500&filter[deal_type]={dt}', headers=H, timeout=10)
        total_fee = sum(c.get('service_fee', 0) or 0 for c in r.json().get('data', []))
        print(f'  {dt}: {cnt} 个合同, 总金额 ¥{total_fee:,}')

# 6. 财务统计
print('\n📊 财务统计:')
r = requests.get(f'{BASE}/api/salaries:list?pageSize=500', headers=H, timeout=10)
if r.status_code == 200:
    sals = r.json().get('data', [])
    total_salary = sum(s.get('net_salary', 0) or 0 for s in sals)
    print(f'  薪资记录: {len(sals)} 条, 7月薪资总额 ¥{total_salary:,}')

r = requests.get(f'{BASE}/api/commissions:list?pageSize=500', headers=H, timeout=10)
if r.status_code == 200:
    comms = r.json().get('data', [])
    total_comm = sum(c.get('amount', 0) or 0 for c in comms)
    print(f'  提成明细: {len(comms)} 条, 提成总额 ¥{total_comm:,}')

# 7. 数据流完整性检查
print('\n📊 数据流完整性:')
r = requests.get(f'{BASE}/api/follow_ups:list?pageSize=500', headers=H, timeout=10)
follow_ups = r.json().get('data', []) if r.status_code == 200 else []
signed_fu = [f for f in follow_ups if f.get('student_status') == '已签约']
print(f'  跟进记录: {len(follow_ups)} 条, 其中已签约 {len(signed_fu)} 条')

r = requests.get(f'{BASE}/api/copywriter_clients:list?pageSize=500', headers=H, timeout=10)
cc = r.json().get('data', []) if r.status_code == 200 else []
print(f'  文书客户: {len(cc)} 条 (签约后自动创建)')

r = requests.get(f'{BASE}/api/contracts:list?pageSize=500', headers=H, timeout=10)
contracts = r.json().get('data', []) if r.status_code == 200 else []
print(f'  合同: {len(contracts)} 条')

r = requests.get(f'{BASE}/api/application_follow:list?pageSize=500', headers=H, timeout=10)
app_follow = r.json().get('data', []) if r.status_code == 200 else []
print(f'  申请跟进: {len(app_follow)} 条 (留学合同→申请)')

# 8. 检查工作流状态
print('\n📊 工作流状态:')
r = requests.get(f'{BASE}/api/workflows:list?pageSize=50', headers=H, timeout=10)
if r.status_code == 200:
    for wf in r.json().get('data', []):
        print(f'  {wf.get("title","?")}: enabled={wf.get("enabled")}, executed={wf.get("executed")}, key={wf.get("key","?")}')

# 9. 系统健康检查
print('\n📊 系统健康检查:')
try:
    r = requests.get(f'{BASE}/api/app:getInfo', headers=H, timeout=5)
    if r.status_code == 200:
        info = r.json().get('data', {})
        print(f'  状态: ✅ 正常')
        print(f'  NocoBase 版本: {info.get("version", "?")}')
    else:
        print(f'  状态: ⚠️ {r.status_code}')
except Exception as e:
    print(f'  状态: ❌ {e}')

print('\n' + '=' * 70)
print('✅ 验证完成')
print('=' * 70)
