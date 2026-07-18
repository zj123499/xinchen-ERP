"""第三步：最终交付报告"""
import requests, json

BASE = 'http://111.229.72.128:8080'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoiYWRtaW4iLCJpYXQiOjE3ODQwOTY0MzQsImV4cCI6MzMzNDE2OTY0MzR9.XK2f4Wl-nD-U5neYR12ln77PAFilhWUvfvPths1Ov5Q'
H = {'Authorization': f'Bearer {TOKEN}', 'Content-Type': 'application/json'}

print("=" * 60)
print("📋 最终交付报告")
print("=" * 60)

# 1. 系统状态检查
print("\n【1. 系统状态检查】")
r = requests.get(f'{BASE}/api/leads:list?pageSize=500', headers=H)
print(f"  leads: {len(r.json().get('data', []))} 条")
r = requests.get(f'{BASE}/api/follow_ups:list?pageSize=500', headers=H)
print(f"  follow_ups: {len(r.json().get('data', []))} 条")
r = requests.get(f'{BASE}/api/contracts:list?pageSize=500', headers=H)
print(f"  contracts: {len(r.json().get('data', []))} 条")
r = requests.get(f'{BASE}/api/partners:list?pageSize=500', headers=H)
print(f"  partners: {len(r.json().get('data', []))} 条")
r = requests.get(f'{BASE}/api/sites:list?pageSize=500', headers=H)
print(f"  sites: {len(r.json().get('data', []))} 条")
r = requests.get(f'{BASE}/api/employees:list?pageSize=500', headers=H)
print(f"  employees: {len(r.json().get('data', []))} 条")

# 2. 字段配置检查
print("\n【2. leads 表字段最终配置】")
r = requests.get(f'{BASE}/api/fields:list?pageSize=500&filter[collectionName]=leads', headers=H)
for f in sorted(r.json()['data'], key=lambda x: x['name']):
    target = f" → {f.get('target')}" if f.get('target') else ""
    print(f"  {f['name']}: type={f['type']}, interface={f['interface']}, required={f.get('required')}{target}")

# 3. 工作流状态
print("\n【3. 工作流状态】")
r = requests.get(f'{BASE}/api/workflows:list?pageSize=500', headers=H)
for wf in r.json()['data']:
    print(f"  {wf['title']} (enabled={wf.get('enabled')}, executed={wf.get('executed')})")

# 4. 角色权限
print("\n【4. 角色权限】")
r = requests.get(f'{BASE}/api/roles:list?pageSize=500', headers=H)
for role in r.json()['data']:
    if role['name'] in ('admin', 'root', 'member'):
        continue
    strategy = role.get('strategy') or {}
    actions = strategy.get('actions', [])
    print(f"  {role['name']} ({role.get('title', '')}): {actions}")

print("\n" + "=" * 60)
print("✅ 所有任务完成！")
print("=" * 60)
