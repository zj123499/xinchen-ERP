#!/usr/bin/env python3
"""
新辰业务管理系统 — 20组完整业务数据生成脚本
覆盖：新媒体、市场、顾问、文书、财务、站群 六大部门
"""

import requests, json, time, sys
from datetime import datetime

BASE = 'http://111.229.72.128:8080'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoiYWRtaW4iLCJpYXQiOjE3ODQwOTY0MzQsImV4cCI6MzMzNDE2OTY0MzR9.XK2f4Wl-nD-U5neYR12ln77PAFilhWUvfvPths1Ov5Q'
H = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}

results = {
    'partners': [], 'sites': [], 'employees': [],
    'leads': [], 'follow_ups': [], 'contracts': [],
    'application_follow': [], 'rental_orders': [], 'overseas_services': [],
    'media_accounts': [], 'media_performance': [],
    'salaries': [], 'commissions': [],
    'errors': []
}

def api(method, path, data=None):
    """通用 API 调用"""
    url = f'{BASE}{path}'
    try:
        if method == 'GET':
            r = requests.get(url, headers=H, timeout=15)
        elif method == 'POST':
            r = requests.post(url, headers=H, json=data, timeout=15)
        elif method == 'PUT':
            r = requests.put(url, headers=H, json=data, timeout=15)
        elif method == 'DELETE':
            r = requests.delete(url, headers=H, timeout=15)
        if r.status_code in (200, 201):
            return r.json()
        else:
            err = f'{method} {path}: {r.status_code} {r.text[:200]}'
            results['errors'].append(err)
            print(f'  ⚠️ {err}')
            return None
    except Exception as e:
        err = f'{method} {path}: {e}'
        results['errors'].append(err)
        print(f'  ❌ {err}')
        return None

# ==================== 用户 ID 映射 ====================
USERS = {
    'admin': 1, 'zhaojie': 3, 'wuxuejiao': 4, 'zhangnan': 5,
    'yaojing': 6, 'qiufeng': 7, 'qinyan': 8, 'wangxiaoke': 9,
    'heyujie': 10, 'weijing': 11, 'lvzongyuan': 12, 'xudongqing': 13
}

print('=' * 70)
print('新辰业务管理系统 — 20组业务数据生成')
print('=' * 70)

# ==================== STEP 1: 补充基础数据 ====================
print('\n📋 STEP 1: 补充基础数据（合作方、站群、员工）')

# --- 1a. 补充合作方 ---
new_partners = [
    {'name': '马来亚大学', 'partner_type': '院校', 'country': '马来西亚', 'contact_name': '陈主任', 'contact_phone': '03-79677022', 'has_commission': True, 'commission_rate': 15},
    {'name': '悉尼大学', 'partner_type': '院校', 'country': '澳洲', 'contact_name': 'Dr. Smith', 'contact_phone': '+61-2-86271444', 'has_commission': True, 'commission_rate': 12},
    {'name': '伦敦大学学院', 'partner_type': '院校', 'country': '英国', 'contact_name': 'Prof. Brown', 'contact_phone': '+44-20-76792000', 'has_commission': False, 'commission_rate': 0},
    {'name': '环球雅思', 'partner_type': '语言学校', 'country': '新加坡', 'contact_name': '李老师', 'contact_phone': '010-88886666', 'has_commission': True, 'commission_rate': 8},
    {'name': 'IDP教育', 'partner_type': '中介', 'country': '澳洲', 'contact_name': 'Mark', 'contact_phone': '+61-3-96061600', 'has_commission': True, 'commission_rate': 10},
]

for p in new_partners:
    resp = api('POST', '/api/partners:create', p)
    if resp:
        pid = resp.get('data', {}).get('id')
        results['partners'].append(pid)
        print(f'  ✅ 合作方: {p["name"]} (id={pid})')

# --- 1b. 补充站群 ---
new_sites = [
    {'name': '新加坡留学站', 'domain': 'sg.xinchen-edu.com', 'site_type': '院校站', 'icp_company': '新辰教育科技有限公司', 'status': '运营中', 'server': '阿里云ECS', 'server_expiry': '2027-06-01', 'domain_expiry': '2027-12-31'},
    {'name': '马来西亚留学站', 'domain': 'my.xinchen-edu.com', 'site_type': '院校站', 'icp_company': '新辰教育科技有限公司', 'status': '运营中', 'server': '阿里云ECS', 'server_expiry': '2027-03-15', 'domain_expiry': '2027-09-20'},
    {'name': '新辰留学论坛', 'domain': 'bbs.xinchen-edu.com', 'site_type': '主站', 'icp_company': '新辰教育科技有限公司', 'status': '维护中', 'server': '腾讯云', 'server_expiry': '2026-10-01', 'domain_expiry': '2027-06-30'},
    {'name': '澳洲留学资讯站', 'domain': 'au.xinchen-edu.com', 'site_type': '院校站', 'icp_company': '新辰教育科技有限公司', 'status': '运营中', 'server': '阿里云ECS', 'server_expiry': '2027-08-20', 'domain_expiry': '2027-11-15'},
]

for s in new_sites:
    resp = api('POST', '/api/sites:create', s)
    if resp:
        sid = resp.get('data', {}).get('id')
        results['sites'].append(sid)
        print(f'  ✅ 站群: {s["name"]} (id={sid})')

# --- 1c. 补充员工信息 ---
new_employees = [
    {'user': USERS['zhaojie'], 'name': '赵杰', 'position': '总经理', 'base_salary': 20000, 'performance_salary': 5000, 'phone': '13800000001', 'email': 'zhaojie@xinchen-edu.com', 'department': '总经办', 'bank_name': '招商银行', 'bank_account': '6214850000000001', 'entry_date': '2023-01-01', 'status': '在职', 'employee_no': 'EMP0001'},
    {'user': USERS['wuxuejiao'], 'name': '吴雪娇', 'position': '运营总监', 'base_salary': 15000, 'performance_salary': 3000, 'phone': '13800000002', 'email': 'wuxuejiao@xinchen-edu.com', 'department': '运营部', 'bank_name': '工商银行', 'bank_account': '6212260000000002', 'entry_date': '2023-03-01', 'status': '在职', 'employee_no': 'EMP0002'},
    {'user': USERS['zhangnan'], 'name': '张楠', 'position': '留学顾问', 'base_salary': 8000, 'performance_salary': 2000, 'phone': '13800000005', 'email': 'zhangnan@xinchen-edu.com', 'department': '留学部', 'bank_name': '招商银行', 'bank_account': '6214850000000005', 'entry_date': '2024-01-15', 'status': '在职', 'employee_no': 'EMP0003'},
    {'user': USERS['yaojing'], 'name': '姚静', 'position': '留学顾问', 'base_salary': 8000, 'performance_salary': 2000, 'phone': '13800000006', 'email': 'yaojing@xinchen-edu.com', 'department': '留学部', 'bank_name': '建设银行', 'bank_account': '6217000000000006', 'entry_date': '2024-06-01', 'status': '在职', 'employee_no': 'EMP0004'},
    {'user': USERS['qiufeng'], 'name': '邱枫', 'position': '市场', 'base_salary': 9000, 'performance_salary': 2000, 'phone': '13800000007', 'email': 'qiufeng@xinchen-edu.com', 'department': '市场部', 'bank_name': '农业银行', 'bank_account': '6228480000000007', 'entry_date': '2024-03-01', 'status': '在职', 'employee_no': 'EMP0005'},
    {'user': USERS['qinyan'], 'name': '秦燕', 'position': '新媒体组长', 'base_salary': 10000, 'performance_salary': 2500, 'phone': '13800000008', 'email': 'qinyan@xinchen-edu.com', 'department': '新媒体部', 'bank_name': '中国银行', 'bank_account': '6216600000000008', 'entry_date': '2024-02-01', 'status': '在职', 'employee_no': 'EMP0006'},
    {'user': USERS['wangxiaoke'], 'name': '王小可', 'position': '运营专员', 'base_salary': 6000, 'performance_salary': 1500, 'phone': '13800000009', 'email': 'wangxiaoke@xinchen-edu.com', 'department': '新媒体部', 'bank_name': '交通银行', 'bank_account': '6222620000000009', 'entry_date': '2025-01-01', 'status': '在职', 'employee_no': 'EMP0007'},
    {'user': USERS['heyujie'], 'name': '何雨洁', 'position': '运营专员', 'base_salary': 6000, 'performance_salary': 1500, 'phone': '13800000010', 'email': 'heyujie@xinchen-edu.com', 'department': '新媒体部', 'bank_name': '浦发银行', 'bank_account': '6217920000000010', 'entry_date': '2025-03-01', 'status': '在职', 'employee_no': 'EMP0008'},
    {'user': USERS['weijing'], 'name': '韦静', 'position': '文案', 'base_salary': 7000, 'performance_salary': 1500, 'phone': '13800000011', 'email': 'weijing@xinchen-edu.com', 'department': '文书部', 'bank_name': '兴业银行', 'bank_account': '6229080000000011', 'entry_date': '2024-09-01', 'status': '在职', 'employee_no': 'EMP0009'},
    {'user': USERS['lvzongyuan'], 'name': '吕宗远', 'position': '站群', 'base_salary': 8000, 'performance_salary': 1500, 'phone': '13800000012', 'email': 'lvzongyuan@xinchen-edu.com', 'department': '技术部', 'bank_name': '民生银行', 'bank_account': '6226220000000012', 'entry_date': '2024-04-01', 'status': '在职', 'employee_no': 'EMP0010'},
    {'user': USERS['xudongqing'], 'name': '许冬青', 'position': '会计', 'base_salary': 7500, 'performance_salary': 1500, 'phone': '13800000013', 'email': 'xudongqing@xinchen-edu.com', 'department': '财务部', 'bank_name': '光大银行', 'bank_account': '6226630000000013', 'entry_date': '2024-07-01', 'status': '在职', 'employee_no': 'EMP0011'},
]

for emp in new_employees:
    resp = api('POST', '/api/employees:create', emp)
    if resp:
        eid = resp.get('data', {}).get('id')
        results['employees'].append(eid)
        print(f'  ✅ 员工: {emp["name"]} (id={eid})')

# 获取实际创建的员工 ID（用于后续薪资）
time.sleep(2)
emp_list = api('GET', '/api/employees:list?pageSize=50')
EMP_IDS = {}
if emp_list:
    for e in emp_list.get('data', []):
        EMP_IDS[e['name']] = e['id']
    print(f'  📊 员工ID映射: {EMP_IDS}')

# 获取所有合作方和站群的 ID
partner_list = api('GET', '/api/partners:list?pageSize=50')
partner_ids = [p['id'] for p in partner_list.get('data', [])] if partner_list else []
site_list = api('GET', '/api/sites:list?pageSize=50')
site_ids = [s['id'] for s in site_list.get('data', [])] if site_list else []
print(f'  📊 合作方IDs: {partner_ids}, 站群IDs: {site_ids}')

# ==================== STEP 2: 创建 20 组线索数据 ====================
print('\n📋 STEP 2: 创建 20 组线索数据（覆盖所有部门和业务方向）')

# 线索数据模板
leads_data = [
    # === 新媒体部门线索 (抖音/视频号/公众号/小红书/知乎) ===
    {
        'name': '张雨晨', 'phone': '13900010001', 'wechat': 'zyc_edu2026', 'gender': '女',
        'source': '抖音', 'business_type': '留学', 'education': '本科',
        'intended_countries': ['新加坡'], 'intended_school': '新加坡国立大学',
        'intended_major': '数据科学', 'student_status': '跟进中',
        'assigned_to': USERS['zhangnan'], 'notes': '抖音留资，985大四在读，GPA 3.6'
    },
    {
        'name': '刘浩然', 'phone': '13900010002', 'wechat': 'lhr_uk', 'gender': '男',
        'source': '视频号', 'business_type': '留学', 'education': '本科',
        'intended_countries': ['英国'], 'intended_school': '曼彻斯特大学',
        'intended_major': '金融学', 'student_status': '新线索',
        'assigned_to': USERS['yaojing'], 'notes': '视频号直播留资，211金融专业'
    },
    {
        'name': '陈思琪', 'phone': '13900010003', 'wechat': 'csq_oz', 'gender': '女',
        'source': '小红书', 'business_type': '留学', 'education': '高中',
        'intended_countries': ['澳洲'], 'intended_school': '墨尔本大学',
        'intended_major': '传媒学', 'student_status': '跟进中',
        'assigned_to': USERS['zhangnan'], 'notes': '小红书爆款笔记留资，高二在读'
    },
    {
        'name': '赵一鸣', 'phone': '13900010004', 'wechat': 'zym_rent', 'gender': '男',
        'source': '公众号', 'business_type': '租房', 'education': '硕士',
        'intended_countries': ['新加坡'], 'student_status': '新线索',
        'assigned_to': USERS['qiufeng'], 'notes': '公众号文章留资，NTU研究生，需要新加坡租房'
    },
    {
        'name': '孙雨桐', 'phone': '13900010005', 'wechat': 'syt_my', 'gender': '女',
        'source': '知乎', 'business_type': '留学', 'education': '本科',
        'intended_countries': ['马来西亚'], 'intended_school': '马来亚大学',
        'intended_major': '商业分析', 'student_status': '跟进中',
        'assigned_to': USERS['yaojing'], 'notes': '知乎专业回答留资，双非一本'
    },
    # === 市场部门线索 (合作方/直播) ===
    {
        'name': '周浩宇', 'phone': '13900020001', 'wechat': 'zhy_sg', 'gender': '男',
        'source': '合作方', 'business_type': '留学', 'education': '本科',
        'source_partner': partner_ids[0] if partner_ids else None,
        'intended_countries': ['新加坡'], 'intended_school': '新加坡管理学院',
        'intended_major': '工商管理', 'student_status': '新线索',
        'assigned_to': USERS['qiufeng'], 'notes': '合作方推荐，211大四'
    },
    {
        'name': '吴嘉豪', 'phone': '13900020002', 'wechat': 'wjh_uk', 'gender': '男',
        'source': '直播', 'business_type': '留学', 'education': '高中',
        'intended_countries': ['英国'], 'intended_school': '伯明翰大学',
        'intended_major': '计算机科学', 'student_status': '跟进中',
        'assigned_to': USERS['qiufeng'], 'notes': '直播间留资，高三毕业'
    },
    {
        'name': '郑雨菲', 'phone': '13900020003', 'wechat': 'zyf_au', 'gender': '女',
        'source': '合作方', 'business_type': '境外服务', 'education': '本科',
        'source_partner': partner_ids[1] if len(partner_ids) > 1 else None,
        'intended_countries': ['澳洲'], 'student_status': '新线索',
        'assigned_to': USERS['qiufeng'], 'notes': '合作方转介绍，悉尼大学已录取，需境外接机'
    },
    {
        'name': '钱晓明', 'phone': '13900020004', 'wechat': 'qxm_rent', 'gender': '男',
        'source': '合作方', 'business_type': '租房', 'education': '硕士',
        'source_partner': partner_ids[4] if len(partner_ids) > 4 else None,
        'intended_countries': ['英国'], 'student_status': '新线索',
        'assigned_to': USERS['qiufeng'], 'notes': 'IDP教育推荐，UCL录取，需要伦敦租房'
    },
    # === 顾问部门线索 (口碑介绍/GEO/其他) ===
    {
        'name': '林小萱', 'phone': '13900030001', 'wechat': 'lxx_sg', 'gender': '女',
        'source': '口碑介绍', 'business_type': '留学', 'education': '本科',
        'intended_countries': ['新加坡'], 'intended_school': '南洋理工大学',
        'intended_major': '电子工程', 'student_status': '跟进中',
        'assigned_to': USERS['zhangnan'], 'notes': '老客户转介绍，985工科'
    },
    {
        'name': '黄志远', 'phone': '13900030002', 'wechat': 'hzy_my', 'gender': '男',
        'source': 'GEO', 'business_type': '留学', 'education': '本科',
        'intended_countries': ['马来西亚'], 'intended_school': '马来西亚英迪大学',
        'intended_major': '酒店管理', 'student_status': '新线索',
        'assigned_to': USERS['yaojing'], 'notes': 'Google搜索留资'
    },
    {
        'name': '杨梦琪', 'phone': '13900030003', 'wechat': 'ymq_overseas', 'gender': '女',
        'source': '口碑介绍', 'business_type': '境外服务', 'education': '硕士',
        'intended_countries': ['新加坡'], 'student_status': '新线索',
        'assigned_to': USERS['zhangnan'], 'notes': '朋友推荐，NUS录取，需接机+陪同'
    },
    {
        'name': '徐俊杰', 'phone': '13900030004', 'wechat': 'xjj_uk', 'gender': '男',
        'source': 'GEO', 'business_type': '留学', 'education': '博士',
        'intended_countries': ['英国'], 'intended_school': '剑桥大学',
        'intended_major': '生物医学', 'student_status': '已签约',
        'assigned_to': USERS['yaojing'], 'notes': 'GEO优质线索，985博士毕业申请博后'
    },
    # === 站群部门线索 ===
    {
        'name': '马晓宇', 'phone': '13900040001', 'wechat': 'mxy_sg', 'gender': '男',
        'source': '站群', 'business_type': '留学', 'education': '高中',
        'source_site': site_ids[0] if site_ids else None,
        'intended_countries': ['新加坡'], 'intended_school': '新加坡管理学院',
        'intended_major': '会计学', 'student_status': '新线索',
        'assigned_to': USERS['zhangnan'], 'notes': '新加坡站留资，高二在读'
    },
    {
        'name': '何雨晴', 'phone': '13900040002', 'wechat': 'hyq_my', 'gender': '女',
        'source': '站群', 'business_type': '留学', 'education': '本科',
        'source_site': site_ids[1] if len(site_ids) > 1 else None,
        'intended_countries': ['马来西亚'], 'intended_school': '马来亚大学',
        'intended_major': '教育学', 'student_status': '跟进中',
        'assigned_to': USERS['yaojing'], 'notes': '马来西亚站留资'
    },
    # === 总经理/运营总监直接录入 ===
    {
        'name': '胡天宇', 'phone': '13900050001', 'wechat': 'hty_au', 'gender': '男',
        'source': '今日头条', 'business_type': '留学', 'education': '本科',
        'intended_countries': ['澳洲'], 'intended_school': '悉尼大学',
        'intended_major': '土木工程', 'student_status': '新线索',
        'assigned_to': USERS['zhaojie'], 'notes': '总经理录入，985本科'
    },
    {
        'name': '高思远', 'phone': '13900050002', 'wechat': 'gsy_uk', 'gender': '男',
        'source': '直播', 'business_type': '留学', 'education': '硕士',
        'intended_countries': ['英国'], 'intended_school': '帝国理工',
        'intended_major': '人工智能', 'student_status': '跟进中',
        'assigned_to': USERS['wuxuejiao'], 'notes': '运营总监录入，985硕士在读'
    },
    # === 多渠道线索 ===
    {
        'name': '唐晓萌', 'phone': '13900060001', 'wechat': 'txm_rent', 'gender': '女',
        'source': '抖音', 'business_type': '租房', 'education': '本科',
        'intended_countries': ['新加坡'], 'student_status': '新线索',
        'assigned_to': USERS['qiufeng'], 'notes': '抖音私信留资，NTU新生需要租房'
    },
    {
        'name': '沈一诺', 'phone': '13900060002', 'wechat': 'syn_overseas', 'gender': '女',
        'source': '小红书', 'business_type': '境外服务', 'education': '本科',
        'intended_countries': ['马来西亚'], 'student_status': '跟进中',
        'assigned_to': USERS['zhangnan'], 'notes': '小红书私信，马来亚大学新生需接机'
    },
    {
        'name': '冯浩然', 'phone': '13900060003', 'wechat': 'fhr_usa', 'gender': '男',
        'source': '视频号', 'business_type': '留学', 'education': '本科',
        'intended_countries': ['美国'], 'intended_school': '纽约大学',
        'intended_major': '金融工程', 'student_status': '已签约',
        'assigned_to': USERS['yaojing'], 'notes': '视频号直播留资，C9本科GPA3.9'
    },
]

# 先清理旧的测试数据 (leads id > 20)
print('  清理旧测试数据...')
old_leads = api('GET', '/api/leads:list?pageSize=500&filter[id][$gt]=20')
if old_leads and old_leads.get('data'):
    for ol in old_leads['data']:
        api('DELETE', f'/api/leads/{ol["id"]}')

# 清理旧关联数据
for tbl in ['follow_ups', 'copywriter_clients', 'contracts', 'application_follow', 'rental_orders', 'overseas_services']:
    old = api('GET', f'/api/{tbl}:list?pageSize=500&filter[id][$gt]=3')
    if old and old.get('data'):
        for o in old['data']:
            api('DELETE', f'/api/{tbl}/{o["id"]}')

# 创建线索
lead_records = []
for i, lead in enumerate(leads_data):
    # 构建数据（去掉 source_partner/source_site 如果为 None）
    data = {k: v for k, v in lead.items() if v is not None}
    
    # 处理关联字段：NocoBase 使用外键名
    if 'source_partner' in data:
        data['source_partner'] = data.pop('source_partner')
    if 'source_site' in data:
        data['source_site'] = data.pop('source_site')
    
    resp = api('POST', '/api/leads:create', data)
    if resp:
        lid = resp.get('data', {}).get('id')
        lead_records.append({'id': lid, 'data': data, 'index': i})
        results['leads'].append(lid)
        print(f'  ✅ 线索 #{i+1}: {data["name"]} ({data["source"]}→{data["business_type"]}, id={lid})')
    time.sleep(0.3)

print(f'\n  共创建 {len(lead_records)} 条线索')

# ==================== STEP 3: 创建流转数据（跟进、合同、申请、租房、境外） ====================
print('\n📋 STEP 3: 创建业务流转数据（跟进→合同→申请/租房/境外服务）')

# 重新获取线索列表（获取 lead_id 和外键）
time.sleep(2)
all_leads = api('GET', '/api/leads:list?pageSize=500&filter[id][$gt]=20')
all_leads_data = all_leads.get('data', []) if all_leads else []

# 建立 name→lead 映射
lead_map = {}
for ld in all_leads_data:
    lead_map[ld.get('name', '')] = ld

# 获取字段的外键名
print('  获取外键映射...')
# follows_ups 外键
fu_lead_fk = 'f_88d9is1u2mk'
fu_assist_fk = 'f_fx5makvrthp'
fu_follow_by_fk = 'f_3q589oijjf0'

# contracts 外键
ct_lead_fk = 'f_sp15fihznsp'
ct_partner_fk = 'f_0nwdu2mxx3w'
ct_assigned_fk = 'f_lpqkzyf9zo5'
ct_assist_fk = 'f_i7a9atlgdn4'

# application_follow 外键
af_contract_fk = 'f_r9qr5sqv3fa'

# rental_orders 外键
ro_contract_fk = 'f_u58r6trb4yr'
ro_assigned_fk = 'f_w0yvn0xvs2x'

# overseas_services 外键
os_contract_fk = 'f_9ihbktfvnd1'
os_assigned_fk = 'f_tujp4v337la'

# copywriter_clients 外键
cc_lead_fk = 'f_bx4440gp91u'
cc_assigned_fk = 'f_pkshsj9qwc1'
cc_consultant_fk = 'f_g3vdcekgcge'

def get_lead(name):
    ld = lead_map.get(name, {})
    return ld.get('id'), ld.get('assigned_to_id')

# --- 3a. 创建顾问跟进记录 ---
follow_up_data = [
    # 线索→跟进对应
    ('张雨晨', '跟进中', '【7.15】电话：了解了学生基本情况，推荐NUS数据科学专业\n【7.20】微信：发送了申请材料清单，学生正在准备成绩单'),
    ('陈思琪', '跟进中', '【7.15】微信沟通：学生高二在读，建议提前规划雅思\n【7.18】发送了澳洲留学时间线规划'),
    ('孙雨桐', '跟进中', '【7.16】电话：双非一本商科，推荐马来亚大学商业分析\n【7.19】微信：学生比较意向国家，发送对比分析'),
    ('吴嘉豪', '跟进中', '【7.15】直播间留资后电话跟进：高三毕业，对计算机感兴趣\n【7.18】发送了英国CS专业院校推荐'),
    ('林小萱', '跟进中', '【7.14】电话：老客户介绍，985工科，对NTU很感兴趣\n【7.17】面谈：确定了申请方向，开始准备材料'),
    ('何雨晴', '跟进中', '【7.16】电话：马来亚大学教育学方向\n【7.20】微信：发送了马来西亚留学申请指南'),
    ('高思远', '跟进中', '【7.15】电话：985硕士在读，目标是帝国理工AI方向\n【7.19】微信：发送了帝国理工AI专业详细介绍'),
    ('沈一诺', '跟进中', '【7.17】电话：确认马来亚大学入学，需要接机服务\n【7.18】微信：发送境外服务方案'),
    ('徐俊杰', '已签约', '【7.10】电话：985博士，目标是剑桥生物医学\n【7.12】面谈：确定签约，开始准备申请材料\n【7.14】签约完成，转入文书流程'),
    ('冯浩然', '已签约', '【7.11】电话：C9本科GPA3.9，目标纽大金融工程\n【7.13】面谈：确认签约，开始准备GRE\n【7.15】签约完成，开始准备申请'),
]

follow_ups_created = []
for name, status, record in follow_up_data:
    lid, assigned = get_lead(name)
    if lid:
        data = {
            fu_lead_fk: lid,
            'student_name': name,
            'student_status': status,
            'follow_record': record,
            'next_follow_date': '2026-07-25',
            fu_follow_by_fk: assigned,
        }
        # 同步线索基本信息
        ld = lead_map.get(name, {})
        for f in ['phone', 'wechat', 'gender', 'education', 'intended_countries', 'intended_school', 'intended_major']:
            if ld.get(f):
                data[f] = ld[f]
        resp = api('POST', '/api/follow_ups:create', data)
        if resp:
            fid = resp.get('data', {}).get('id')
            follow_ups_created.append({'id': fid, 'name': name, 'status': status, 'lead_id': lid})
            results['follow_ups'].append(fid)
            print(f'  ✅ 跟进: {name} → {status} (id={fid})')
    time.sleep(0.2)

# --- 3b. 创建合同 ---
contract_data = [
    # (学生, 业务类型, 来源渠道, 服务费, 保证金, 签约形式, 状态, 归属顾问, 合作方)
    ('张雨晨', '留学', '新媒体', 45000, 2000, '线上', '已签约', USERS['zhangnan'], None),
    ('陈思琪', '留学', '新媒体', 40000, 2000, '线下', '已签约', USERS['zhangnan'], None),
    ('孙雨桐', '留学', '新媒体', 35000, 2000, '线上', '已签约', USERS['yaojing'], None),
    ('吴嘉豪', '留学', '直播', 50000, 2000, '线上', '已签约', USERS['qiufeng'], None),
    ('林小萱', '留学', '口碑介绍', 48000, 2000, '线下', '已签约', USERS['zhangnan'], None),
    ('何雨晴', '留学', '站群', 32000, 2000, '线上', '申请中', USERS['yaojing'], None),
    ('高思远', '留学', '直播', 55000, 2000, '线下', '已签约', USERS['wuxuejiao'], None),
    ('徐俊杰', '留学', 'GEO', 60000, 2000, '线上', '已签约', USERS['yaojing'], None),
    ('冯浩然', '留学', '新媒体', 52000, 2000, '线上', '已签约', USERS['yaojing'], None),
    ('周浩宇', '留学', '合作方', 38000, 2000, '线上', '已签约', USERS['qiufeng'], partner_ids[0] if partner_ids else None),
    # 租房合同
    ('赵一鸣', '租房', '新媒体', 0, 0, '线上', '已签约', USERS['qiufeng'], None),
    ('唐晓萌', '租房', '新媒体', 0, 0, '线上', '已签约', USERS['qiufeng'], None),
    ('钱晓明', '租房', '合作方', 0, 0, '线下', '已签约', USERS['qiufeng'], partner_ids[4] if len(partner_ids) > 4 else None),
    # 境外服务合同
    ('郑雨菲', '境外服务', '合作方', 260, 0, '线上', '已签约', USERS['qiufeng'], partner_ids[1] if len(partner_ids) > 1 else None),
    ('杨梦琪', '境外服务', '口碑介绍', 260, 0, '线上', '已签约', USERS['zhangnan'], None),
    ('沈一诺', '境外服务', '新媒体', 100, 0, '线上', '已签约', USERS['zhangnan'], None),
]

contracts_created = []
for (name, deal_type, source_channel, service_fee, deposit, sign_method, status, assigned, partner) in contract_data:
    lid, _ = get_lead(name)
    if lid:
        data = {
            ct_lead_fk: lid,
            'student_name': name,
            'deal_type': deal_type,
            'source_channel': source_channel,
            'service_fee': service_fee,
            'deposit': deposit,
            'sign_method': sign_method,
            'sign_date': '2026-07-15',
            'status': status,
            ct_assigned_fk: assigned,
        }
        if partner:
            data[ct_partner_fk] = partner
        resp = api('POST', '/api/contracts:create', data)
        if resp:
            cid = resp.get('data', {}).get('id')
            contracts_created.append({'id': cid, 'name': name, 'deal_type': deal_type, 'service_fee': service_fee, 'lead_id': lid})
            results['contracts'].append(cid)
            print(f'  ✅ 合同: {name} ({deal_type}, ¥{service_fee}, id={cid})')
    time.sleep(0.2)

# --- 3c. 创建文书客户 ---
for name in ['徐俊杰', '冯浩然', '张雨晨', '林小萱', '高思远']:
    lid, assigned = get_lead(name)
    if lid:
        data = {
            cc_lead_fk: lid,
            'student_name': name,
            'status': '材料收集中',
            cc_assigned_fk: USERS['weijing'],
            cc_consultant_fk: assigned,
        }
        resp = api('POST', '/api/copywriter_clients:create', data)
        if resp:
            cid = resp.get('data', {}).get('id')
            results['copywriter_clients'] = results.get('copywriter_clients', []) + [cid]
            print(f'  ✅ 文书客户: {name} (id={cid})')
    time.sleep(0.2)

# --- 3d. 创建申请跟进 ---
# 留学合同 → 申请跟进
study_contracts = [c for c in contracts_created if c['deal_type'] == '留学']
app_data = [
    ('张雨晨', '新加坡', '新加坡国立大学', '数据科学', '硕士', '收集中', 'PS初稿已完成', '未申请', '等待中'),
    ('陈思琪', '澳洲', '墨尔本大学', '传媒学', '本科', '待收集', None, '未申请', '等待中'),
    ('孙雨桐', '马来西亚', '马来亚大学', '商业分析', '硕士', '已齐全', '材料已齐全，准备递交', '未申请', '等待中'),
    ('吴嘉豪', '英国', '伯明翰大学', '计算机科学', '本科', '待收集', None, '未申请', '等待中'),
    ('林小萱', '新加坡', '南洋理工大学', '电子工程', '硕士', '收集中', 'CV已完成', '未申请', '等待中'),
    ('高思远', '英国', '帝国理工', '人工智能', '硕士', '收集中', 'PS写作中', '未申请', '等待中'),
    ('徐俊杰', '英国', '剑桥大学', '生物医学', '博士', '已齐全', '研究计划已完成', '未申请', '等待中'),
    ('冯浩然', '美国', '纽约大学', '金融工程', '硕士', '收集中', 'GRE备考中', '未申请', '等待中'),
]

for (name, country, school, major, degree, mat_status, mat_notes, visa, offer) in app_data:
    # 找对应的合同
    matching_ct = [c for c in contracts_created if c['name'] == name and c['deal_type'] == '留学']
    if matching_ct:
        data = {
            af_contract_fk: matching_ct[0]['id'],
            'student_name': name,
            'country': country,
            'school_name': school,
            'major': major,
            'degree': degree,
            'material_status': mat_status,
            'visa_status': visa,
            'offer_result': offer,
        }
        if mat_notes:
            data['material_notes'] = mat_notes
        resp = api('POST', '/api/application_follow:create', data)
        if resp:
            aid = resp.get('data', {}).get('id')
            results['application_follow'].append(aid)
            print(f'  ✅ 申请跟进: {name} → {school} ({country}) (id={aid})')
    time.sleep(0.2)

# --- 3e. 创建租房订单 ---
rental_contracts = [c for c in contracts_created if c['deal_type'] == '租房']
rental_data = [
    ('赵一鸣', 'C端', '新加坡 NTU 附近公寓', 2500, '一年', 800, '2026-08-01', '2026-08-20', '新加坡房管Lee', '已预定'),
    ('唐晓萌', 'C端', '新加坡 NUS 附近组屋', 2200, '半年', 500, '2026-09-01', '2026-08-15', '新加坡房管Chen', '咨询中'),
    ('钱晓明', 'C端', '伦敦 UCL 附近学生公寓', 3500, '一年', 1000, '2026-09-15', '2026-09-01', '伦敦房管Zhang', '已预定'),
]

for (name, ctype, addr, rent, term, commission, settle_date, move_in, prop_mgr, status) in rental_data:
    matching_ct = [c for c in contracts_created if c['name'] == name]
    if matching_ct:
        data = {
            ro_contract_fk: matching_ct[0]['id'],
            'student_name': name,
            'client_type': ctype,
            'address': addr,
            'monthly_rent': rent,
            'lease_term': term,
            'commission_income': commission,
            'commission_settle_date': settle_date,
            'move_in_date': move_in,
            'property_manager': prop_mgr,
            'status': status,
            ro_assigned_fk: USERS['qiufeng'],
        }
        resp = api('POST', '/api/rental_orders:create', data)
        if resp:
            rid = resp.get('data', {}).get('id')
            results['rental_orders'].append(rid)
            print(f'  ✅ 租房: {name} ({addr}, ¥{rent}/月, id={rid})')
    time.sleep(0.2)

# --- 3f. 创建境外服务 ---
overseas_contracts = [c for c in contracts_created if c['deal_type'] == '境外服务']
overseas_data = [
    ('郑雨菲', '新加坡接机', 200, '新加坡', '2026-09-01', '已安排'),
    ('杨梦琪', '新加坡接机+陪同', 260, '新加坡', '2026-09-05', '待安排'),
    ('沈一诺', '马来西亚接机+陪同', 100, '马来西亚', '2026-09-10', '已安排'),
]

for (name, stype, fee, country, sdate, status) in overseas_data:
    matching_ct = [c for c in contracts_created if c['name'] == name]
    if matching_ct:
        data = {
            os_contract_fk: matching_ct[0]['id'],
            'student_name': name,
            'service_type': stype,
            'service_fee': fee,
            'country': country,
            'service_date': sdate,
            'status': status,
            os_assigned_fk: USERS['zhangnan'] if name != '郑雨菲' else USERS['qiufeng'],
        }
        resp = api('POST', '/api/overseas_services:create', data)
        if resp:
            oid = resp.get('data', {}).get('id')
            results['overseas_services'].append(oid)
            print(f'  ✅ 境外服务: {name} ({stype}, ¥{fee}, id={oid})')
    time.sleep(0.2)

# ==================== STEP 4: 新媒体数据 ====================
print('\n📋 STEP 4: 创建新媒体账号和业绩数据')

# 获取媒体外键
ma_owner_fk = 'f_1f33lsfg1fq'
mp_employee_fk = 'f_yc5ppy3bnv0'

# 账号数据
media_accounts = [
    {'platform': '抖音', 'account_name': '新辰留学小助手', 'account_id': 'DX123456', 'persona': '专业留学顾问', 'cert_company': '新辰教育科技有限公司', 'bind_phone': '13800000001', 'phone_status': '正常', 'status': '运营中', ma_owner_fk: USERS['qinyan']},
    {'platform': '抖音', 'account_name': '新加坡学姐说', 'account_id': 'DX789012', 'persona': 'NUS学姐，分享新加坡生活', 'cert_company': '新辰教育科技有限公司', 'bind_phone': '13800000009', 'phone_status': '正常', 'status': '运营中', ma_owner_fk: USERS['wangxiaoke']},
    {'platform': '视频号', 'account_name': '新辰留学中心', 'account_id': 'SPH345678', 'persona': '留学干货分享', 'cert_company': '新辰教育科技有限公司', 'bind_phone': '13800000008', 'phone_status': '正常', 'status': '运营中', ma_owner_fk: USERS['qinyan']},
    {'platform': '小红书', 'account_name': '留学那些事儿', 'account_id': 'XHS901234', 'persona': '留学避坑指南', 'cert_company': '新辰教育科技有限公司', 'bind_phone': '13800000010', 'phone_status': '正常', 'status': '运营中', ma_owner_fk: USERS['heyujie']},
    {'platform': '知乎', 'account_name': '新辰留学说', 'account_id': 'ZH567890', 'persona': '专业留学问答', 'cert_company': '新辰教育科技有限公司', 'bind_phone': '13800000009', 'phone_status': '正常', 'status': '运营中', ma_owner_fk: USERS['wangxiaoke']},
    {'platform': '公众号', 'account_name': '新辰留学指南', 'account_id': 'GZH234567', 'persona': '每日留学资讯推送', 'cert_company': '新辰教育科技有限公司', 'bind_phone': '13800000008', 'phone_status': '正常', 'status': '运营中', ma_owner_fk: USERS['qinyan']},
]

media_account_ids = []
for ma in media_accounts:
    resp = api('POST', '/api/media_accounts:create', ma)
    if resp:
        mid = resp.get('data', {}).get('id')
        media_account_ids.append(mid)
        results['media_accounts'].append(mid)
        print(f'  ✅ 账号: {ma["account_name"]} ({ma["platform"]}, id={mid})')
    time.sleep(0.2)

# 业绩数据（7月）
media_performance_data = [
    # 秦燕（组长）
    {'role': '新媒体组长', 'record_month': '2026-07-01', 'view_count': 25000, 'clue_count': 180, 'deal_count': 5, 'view_bonus': 200, 'clue_bonus': 200, 'deal_bonus': 500, 'team_bonus': 500, 'total_commission': 1400, mp_employee_fk: USERS['qinyan']},
    # 王小可
    {'role': '运营专员', 'record_month': '2026-07-01', 'view_count': 15000, 'clue_count': 120, 'deal_count': 3, 'view_bonus': 200, 'clue_bonus': 0, 'deal_bonus': 300, 'team_bonus': 0, 'total_commission': 500, mp_employee_fk: USERS['wangxiaoke']},
    # 何雨洁
    {'role': '运营专员', 'record_month': '2026-07-01', 'view_count': 12000, 'clue_count': 110, 'deal_count': 2, 'view_bonus': 200, 'clue_bonus': 0, 'deal_bonus': 200, 'team_bonus': 0, 'total_commission': 400, mp_employee_fk: USERS['heyujie']},
]

for mp in media_performance_data:
    resp = api('POST', '/api/media_performance:create', mp)
    if resp:
        mpid = resp.get('data', {}).get('id')
        results['media_performance'].append(mpid)
        print(f'  ✅ 业绩: user={mp[mp_employee_fk]} 总提成=¥{mp["total_commission"]} (id={mpid})')
    time.sleep(0.2)

# ==================== STEP 5: 财务数据（薪资+提成） ====================
print('\n📋 STEP 5: 创建财务薪资和提成数据')

# 获取 salaries 外键
sal_employee_fk = 'f_2kz0i3gop7q'
comm_salary_fk = 'f_ki6s884h2hh'
comm_employee_fk = 'f_0d52gjipjux'

# 薪资数据（7月）
salary_data = [
    # (员工名, 底薪, 绩效, 留学提成, 租房提成, 境外提成, 新媒体提成, 团队奖金, 扣款, 状态)
    ('张楠', 8000, 2000, 3200, 0, 260, 0, 0, 0, '待核算'),
    ('姚静', 8000, 2000, 2800, 0, 0, 0, 0, 0, '待核算'),
    ('邱枫', 9000, 2000, 1500, 1800, 200, 0, 0, 0, '待核算'),
    ('秦燕', 10000, 2500, 0, 0, 0, 1400, 500, 0, '待核算'),
    ('王小可', 6000, 1500, 0, 0, 0, 500, 0, 0, '待核算'),
    ('何雨洁', 6000, 1500, 0, 0, 0, 400, 0, 0, '待核算'),
    ('韦静', 7000, 1500, 0, 0, 0, 0, 0, 0, '待核算'),
    ('吕宗远', 8000, 1500, 0, 0, 0, 0, 0, 0, '待核算'),
    ('许冬青', 7500, 1500, 0, 0, 0, 0, 0, 0, '待核算'),
    ('赵杰', 20000, 5000, 0, 0, 0, 0, 0, 0, '待核算'),
    ('吴雪娇', 15000, 3000, 1000, 0, 0, 0, 0, 0, '待核算'),
]

salaries_created = []
for (ename, base, perf, study, rental, overseas, media, team, deduct, status) in salary_data:
    emp_id = EMP_IDS.get(ename)
    if emp_id:
        net = base + perf + study + rental + overseas + media + team - deduct
        data = {
            sal_employee_fk: emp_id,
            'year_month': '2026-07-01',
            'base_salary': base,
            'performance_salary': perf,
            'study_commission': study,
            'rental_commission': rental,
            'overseas_commission': overseas,
            'media_commission': media,
            'team_bonus': team,
            'deduction': deduct,
            'net_salary': net,
            'status': status,
            'paid_date': '2026-08-10',
        }
        resp = api('POST', '/api/salaries:create', data)
        if resp:
            sid = resp.get('data', {}).get('id')
            salaries_created.append({'id': sid, 'name': ename, 'net': net})
            results['salaries'].append(sid)
            print(f'  ✅ 薪资: {ename} 实发=¥{net} (id={sid})')
    time.sleep(0.2)

# 提成明细
commission_details = [
    # 张楠提成
    ('张楠', '留学签约', 'C-张雨晨', 45000, 10, 4500),
    ('张楠', '留学Offer', 'C-张雨晨', 45000, 6, 2700),
    ('张楠', '境外服务', 'OS-杨梦琪', 260, 100, 260),
    # 姚静提成
    ('姚静', '留学签约', 'C-孙雨桐', 35000, 10, 3500),
    ('姚静', '留学Offer', 'C-孙雨桐', 35000, 6, 2100),
    ('姚静', '留学签约', 'C-徐俊杰', 60000, 10, 6000),
    ('姚静', '留学Offer', 'C-徐俊杰', 60000, 6, 3600),
    # 邱枫提成
    ('邱枫', '留学签约', 'C-吴嘉豪', 50000, 8, 4000),
    ('邱枫', '留学Offer', 'C-吴嘉豪', 50000, 4, 2000),
    ('邱枫', '租房', 'R-赵一鸣', 800, 100, 800),
    ('邱枫', '租房', 'R-钱晓明', 1000, 100, 1000),
    ('邱枫', '境外服务', 'OS-郑雨菲', 200, 100, 200),
    # 秦燕提成
    ('秦燕', '新媒体播放量', 'M-7月', 25000, 0, 200),
    ('秦燕', '新媒体线索量', 'M-7月', 180, 0, 200),
    ('秦燕', '新媒体成交', 'M-7月', 5, 100, 500),
    ('秦燕', '团队奖金', 'M-7月', 1, 500, 500),
    # 王小可提成
    ('王小可', '新媒体播放量', 'M-7月', 15000, 0, 200),
    ('王小可', '新媒体成交', 'M-7月', 3, 100, 300),
    # 何雨洁提成
    ('何雨洁', '新媒体播放量', 'M-7月', 12000, 0, 200),
    ('何雨洁', '新媒体成交', 'M-7月', 2, 100, 200),
    # 吴雪娇提成
    ('吴雪娇', '留学签约', 'C-高思远', 55000, 10, 5500),
]

for (ename, ctype, source, base_amount, rate, amount) in commission_details:
    emp_id = EMP_IDS.get(ename)
    # 找对应的薪资记录
    matching_sal = [s for s in salaries_created if s['name'] == ename]
    if emp_id and matching_sal:
        data = {
            comm_employee_fk: emp_id,
            comm_salary_fk: matching_sal[0]['id'],
            'commission_type': ctype,
            'source_record': source,
            'base_amount': base_amount,
            'rate': rate,
            'amount': amount,
        }
        resp = api('POST', '/api/commissions:create', data)
        if resp:
            cid = resp.get('data', {}).get('id')
            results['commissions'].append(cid)
            print(f'  ✅ 提成: {ename} {ctype} ¥{amount} (id={cid})')
    time.sleep(0.15)

# ==================== 最终汇总 ====================
print('\n' + '=' * 70)
print('📊 数据生成完成！汇总报告')
print('=' * 70)

summary = {
    '合作方': len(results['partners']),
    '站群': len(results['sites']),
    '员工信息': len(results['employees']),
    '线索': len(results['leads']),
    '顾问跟进': len(results['follow_ups']),
    '文书客户': len(results.get('copywriter_clients', [])),
    '合同': len(results['contracts']),
    '申请跟进': len(results['application_follow']),
    '租房订单': len(results['rental_orders']),
    '境外服务': len(results['overseas_services']),
    '新媒体账号': len(results['media_accounts']),
    '新媒体业绩': len(results['media_performance']),
    '薪资': len(results['salaries']),
    '提成明细': len(results['commissions']),
}

for k, v in summary.items():
    print(f'  {k}: {v} 条')

print(f'\n  错误: {len(results["errors"])} 个')
if results['errors']:
    for e in results['errors'][:5]:
        print(f'    - {e}')
    if len(results['errors']) > 5:
        print(f'    ... 还有 {len(results["errors"]) - 5} 个错误')

# 保存结果
with open('/tmp/business_data_results.json', 'w', encoding='utf-8') as f:
    json.dump({
        'summary': summary,
        'errors': results['errors'],
        'timestamp': datetime.now().isoformat()
    }, f, ensure_ascii=False, indent=2)

print(f'\n结果已保存到 /tmp/business_data_results.json')
print('✅ 完成！')
