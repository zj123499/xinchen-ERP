import requests, time, json
BASE = 'http://111.229.72.128:8080'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoiYWRtaW4iLCJpYXQiOjE3ODQwOTY0MzQsImV4cCI6MzMzNDE2OTY0MzR9.XK2f4Wl-nD-U5neYR12ln77PAFilhWUvfvPths1Ov5Q'
H = {'Authorization': f'Bearer {TOKEN}'}

url = BASE + '/api/leads:list?pageSize=20&page=1'

print('=== 性能诊断 ===\n')

# 1. 无 appends
start = time.time()
r = requests.get(url, headers=H, timeout=30)
print(f'1. 无 appends:        {time.time()-start:.2f}s, HTTP {r.status_code}, {len(r.json().get("data",[]))}条')

# 2. 单个 append
for append in ['assigned_to', 'source_partner', 'source_site', 'created_by', 'latest_follow_up', 'contract']:
    start = time.time()
    r = requests.get(url + f'&appends%5B%5D={append}', headers=H, timeout=30)
    elapsed = time.time() - start
    status = '✗慢' if elapsed > 2 else '✓'
    print(f'  {status} append={append:20s} {elapsed:.2f}s, HTTP {r.status_code}')

# 3. 全部 appends
print('\n3. 全部 appends:')
start = time.time()
all_appends = '&'.join([f'appends%5B%5D={a}' for a in ['assigned_to', 'source_partner', 'source_site', 'created_by', 'latest_follow_up', 'contract']])
r = requests.get(url + '&' + all_appends, headers=H, timeout=60)
elapsed = time.time() - start
print(f'   耗时: {elapsed:.2f}s, HTTP {r.status_code}, {len(r.json().get("data",[]))}条')

# 4. 检查 N+1 查询问题
if elapsed > 2:
    print('\n=== 检测N+1查询问题 ===')
    data = r.json().get('data', [])
    if data:
        # 查找重复的关联数据
        from collections import Counter
        partners = Counter()
        sites = Counter()
        for item in data:
            p = item.get('source_partner')
            s = item.get('source_site')
            if p:
                partners[p.get('id')] += 1
            if s:
                sites[s.get('id')] += 1
        print(f'关联合作方: {dict(partners)}')
        print(f'关联站群: {dict(sites)}')

# 5. 检查后端是否有慢查询
print('\n=== 完整请求时间线 ===')
for i in range(3):
    start = time.time()
    r = requests.get(url, headers=H, timeout=30)
    print(f'   第{i+1}次: {time.time()-start:.2f}s')
