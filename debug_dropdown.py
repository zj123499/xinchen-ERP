import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

print("=== 1. leads 表字段 assigned_to 详细信息 ===")
r = requests.get(f"{BASE}/api/collections/leads/fields", headers=H)
fields = r.json().get("data", [])
for f in fields:
    name = f.get("name", "")
    if name == "assigned_to":
        print(f"  type: {f.get('type')}")
        print(f"  target: {f.get('target')}")
        print(f"  foreignKey: {f.get('foreignKey')}")
        print(f"  sourceKey: {f.get('sourceKey')}")
        print(f"  interface: {f.get('interface')}")
        print(f"  uiSchema: {json.dumps(f.get('uiSchema', {}), ensure_ascii=False)}")
        print(f"  完整字段: {json.dumps(f, indent=2, ensure_ascii=False)[:2000]}")

print("\n=== 2. 查找 leads 表单页面 UI Schema ===")
r = requests.get(f"{BASE}/api/uiSchemas?pageSize=500", headers=H)
schemas = r.json()
total = schemas.get("meta", {}).get("count", 0)
print(f"  Total schemas: {total}")

if "data" in schemas:
    for s in schemas["data"]:
        key = str(s.get("key", ""))
        name = str(s.get("name", ""))
        cn = str(s.get("collectionName", ""))
        # 找线索录入相关的 schema
        if "lead" in key.lower() or "leads" == cn or "线索" in name or "assigned" in key.lower():
            print(f"\n  Schema: key={key}, name={name}, cn={cn}")
            props = s.get("properties", {})
            for pk, pv in props.items():
                if "assigned" in str(pk).lower():
                    print(f"    >>> [{pk}] {json.dumps(pv, ensure_ascii=False)[:500]}")

print("\n=== 3. 测试 wangxiaoke 获取 users 列表 ===")
# 用 root token 查看 wangxiaoke 的密码/状态
r = requests.get(f"{BASE}/api/users?filter[email]=wangxiaoke@xinchen.com", headers=H)
users = r.json().get("data", [])
if users:
    u = users[0]
    print(f"  用户ID: {u.get('id')}, 昵称: {u.get('nickname')}, 状态: {u.get('status')}")

# 尝试用 root 获取 users 列表看看能不能拉到
r = requests.get(f"{BASE}/api/users?pageSize=5&fields=nickname,id,username", headers=H)
print(f"  root获取users: status={r.status_code}, count={r.json().get('meta', {}).get('count', 0)}")
if "data" in r.json():
    for uu in r.json()["data"]:
        print(f"    {uu.get('id')}: {uu.get('nickname')} ({uu.get('username')})")

# 关键：检查 leads 表是否有 Form block 的 schema
print("\n=== 4. 搜索 Form block schema ===")
r = requests.get(f"{BASE}/api/uiSchemas?pageSize=500", headers=H)
if "data" in r.json():
    for s in r.json()["data"]:
        key = str(s.get("key", ""))
        # 找包含 "form" 或 "add" 的
        schema_type = s.get("x-uid", "")
        props = s.get("properties", {})
        if props:
            for pk in props:
                if "assigned" in str(pk).lower():
                    print(f"\n  找到 assigned_to 在 schema: key={key}")
                    print(f"  properties[{pk}]: {json.dumps(props[pk], ensure_ascii=False)[:600]}")
