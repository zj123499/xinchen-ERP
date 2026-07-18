"""
查 NocoBase 权限的实际存储位置
"""
import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# NocoBase 新版本权限存储在 collection 表的 rolesResourcesScopes 中
# 通过角色编辑页面获取

print("=== 获取 media_staff 角色的完整配置 ===")
r = requests.get(f"{BASE}/api/roles/media_staff", headers=H, params={"appends[]": "resources"})
if r.status_code == 200:
    print(json.dumps(r.json(), ensure_ascii=False, indent=2)[:3000])

# 试试旧版 API
print("\n=== 旧版 API ===")
for path in [
    "/api/roles/media_staff/resources",
    "/api/roles/media_staff/permissions",
]:
    r = requests.get(f"{BASE}{path}", headers=H)
    print(f"  {path}: {r.status_code}")
    if r.status_code == 200:
        data = r.json().get("data", [])
        if data:
            for item in data[:5]:
                print(f"    {json.dumps(item, ensure_ascii=False)[:200]}")

# NocoBase v1.x 权限在 roles.collections 的 JSON 里
print("\n=== 查 roles 表的完整结构 ===")
r = requests.get(f"{BASE}/api/roles?pageSize=20&appends[]=resources", headers=H)
if r.status_code == 200:
    data = r.json().get("data", [])
    for role in data:
        if role["name"] == "media_staff":
            # 看有哪些字段
            print(f"media_staff 字段: {list(role.keys())}")
            # 打印完整数据
            resources = role.get("resources", [])
            if resources:
                print(f"resources 数量: {len(resources)}")
                for res in resources:
                    print(json.dumps(res, ensure_ascii=False)[:200])
            else:
                print("resources 为空")
            # 看看有没有 strategy 字段
            strategy = role.get("strategy") or {}
            print(f"strategy: {json.dumps(strategy, ensure_ascii=False)[:500]}")
            break

# 试试 NocoBase 的权限配置端点
print("\n=== 配置端点 ===")
r = requests.get(f"{BASE}/api/roles/media_staff/collections/users/actions", headers=H)
print(f"users/actions: {r.status_code} {r.text[:300]}")
r = requests.get(f"{BASE}/api/roles/media_staff/collections/leads/actions", headers=H)
print(f"leads/actions: {r.status_code} {r.text[:300]}")
