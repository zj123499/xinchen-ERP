import requests, json, urllib.parse

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {"Authorization": f"Bearer {TOKEN}"}

def api(path, params=None):
    url = f"{BASE}{path}"
    if params:
        qs = urllib.parse.urlencode(params)
        url += "?" + qs
    r = requests.get(url, headers=H)
    if r.status_code != 200:
        print(f"  ERROR {r.status_code}: {r.text[:200]}")
        return {"data": [], "meta": {"count": 0}}
    return r.json()

# 1. 现有页面
print("=== 现有页面 (uiSchemas) ===")
d = api("/api/uiSchemas:list", {"pageSize": 50, "filter[type]": "page"})
for item in d.get("data", []):
    print(f"  key={item.get('key','')} name={item.get('name','')} title={item.get('title','')}")
print(f"  Total: {d.get('meta',{}).get('count',0)}")

# 2. 现有菜单
print("\n=== 现有菜单 ===")
d = api("/api/menus:list", {"pageSize": 30})
for item in d.get("data", []):
    print(f"  id={item.get('id')} title={item.get('title','')} parentId={item.get('parentId','')} schemaName={item.get('schemaName','')}")
print(f"  Total: {d.get('meta',{}).get('count',0)}")

# 3. 角色
print("\n=== 现有角色 ===")
d = api("/api/roles:list", {"pageSize": 20})
for item in d.get("data", []):
    print(f"  name={item.get('name','')} title={item.get('title','')}")

# 4. 用户
print("\n=== 现有用户 ===")
d = api("/api/users:list", {"pageSize": 20})
for item in d.get("data", []):
    print(f"  id={item.get('id')} nickname={item.get('nickname','')} email={item.get('email','')}")

# 5. 业务表
print("\n=== 业务表 ===")
d = api("/api/collections:list", {"pageSize": 50})
for item in d.get("data", []):
    name = item.get("name", "")
    if name not in ["roles", "users", "departments", "attachments", "applicationPlugins"] and "plugin" not in item.get("origin", ""):
        print(f"  {name:30s} title={item.get('title','')}")

# 6. 查看所有 uiSchema (找 top-level page)
print("\n=== 所有 uiSchema (前50) ===")
d = api("/api/uiSchemas:list", {"pageSize": 50})
for item in d.get("data", []):
    t = item.get("type", "")
    name = item.get("name", "")
    title = item.get("title", "")
    if t in ["page", "void"] and not name.startswith("field_"):
        print(f"  uid={item.get('x-uid','')} name={name} title={title} type={t}")
print(f"  Total: {d.get('meta',{}).get('count',0)}")
