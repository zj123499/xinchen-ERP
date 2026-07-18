"""
检查 leads 表中 assigned_to 字段的关联配置
"""
import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 1. 查看 leads 表字段
print("=== leads 表字段 ===")
r = requests.get(f"{BASE}/api/collections/leads/fields", headers=H)
for f in r.json().get("data", []):
    name = f.get("name")
    ftype = f.get("type")
    interface = f.get("interface")
    target = f.get("target")
    if name == "assigned_to":
        print(f"  assigned_to: type={ftype}, interface={interface}, target={target}")
        print(f"  full: {json.dumps(f, ensure_ascii=False, indent=2)[:600]}")
    elif name in ["assist_consultant", "follow_by"]:
        print(f"  {name}: type={ftype}, target={target}")

# 2. 查看 users 表
print("\n=== users 表集合 ===")
r = requests.get(f"{BASE}/api/collections/users", headers=H)
if r.status_code == 200:
    u = r.json().get("data", {})
    print(f"  name: {u.get('name')}, title: {u.get('title')}")
    print(f"  filterTargetKey: {u.get('filterTargetKey')}")
    print(f"  targetKey: {u.get('targetKey')}")

# 3. 尝试直接查询用户数据
print("\n=== 用户数据查询 ===")
r = requests.get(f"{BASE}/api/users?pageSize=50", headers=H)
if r.status_code == 200:
    data = r.json().get("data", [])
    print(f"  共 {len(data)} 个用户:")
    for u in data:
        print(f"    ID={u['id']}, nickname={u.get('nickname')}, username={u.get('username')}")
