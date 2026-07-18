import requests, json, sys
BASE = 'http://111.229.72.128:8080'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoiYWRtaW4iLCJpYXQiOjE3ODQwOTY0MzQsImV4cCI6MzMzNDE2OTY0MzR9.XK2f4Wl-nD-U5neYR12ln77PAFilhWUvfvPths1Ov5Q'
H = {'Authorization': f'Bearer {TOKEN}'}

r = requests.get(f'{BASE}/api/users:list?pageSize=50', headers=H)
users = r.json().get('data', [])

print(f'用户总数: {len(users)}')
for u in users:
    r3 = requests.get(f'{BASE}/api/users:get/{u["id"]}?appends[]=roles', headers=H)
    user_data = r3.json().get('data', {})
    role_names = [r.get('name', '?') for r in user_data.get('roles', [])]
    line = f'  {u.get("nickname", "?")} (id={u["id"]}, email={u.get("email","?")}): 角色={role_names}'
    print(line, flush=True)

# 测试 leads 列表 - 用每个用户身份
for u in users[:5]:
    print(f'\n=== 用户 {u.get("nickname","?")} 测试 leads 列表 ===', flush=True)
    # 模拟普通用户登录
    if u.get('email') and u['email'] != 'admin@xinchen.com':
        r_login = requests.post(f'{BASE}/api/auth:signIn', json={
            'emailOrUsername': u.get('username') or u.get('email'),
            'password': 'Pass@123'
        })
        if r_login.status_code == 200:
            user_token = r_login.json().get('data',{}).get('token','')
            if user_token:
                r_leads = requests.get(f'{BASE}/api/leads:list?pageSize=5', headers={'Authorization': f'Bearer {user_token}'})
                print(f'  leads 列表: HTTP {r_leads.status_code}, 耗时 {r_leads.elapsed.total_seconds():.2f}s, count={r_leads.json().get("meta",{}).get("count","?")}', flush=True)
