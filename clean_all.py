import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {"Authorization": f"Bearer {TOKEN}"}

def api_get(path, params=None):
    r = requests.get(f"{BASE}{path}", headers=H, params=params)
    return r.status_code, r.json() if r.status_code == 200 else {}

def api_delete(path):
    r = requests.delete(f"{BASE}{path}", headers=H)
    return r.status_code

def api_post(path, data):
    r = requests.post(f"{BASE}{path}", headers=H, json=data)
    return r.status_code, r.json() if r.status_code == 200 else {}

# ========== 1. 删除所有 desktopRoutes ==========
print("=== 删除 desktopRoutes ===")
status, data = api_get("/api/desktopRoutes:list", {"pageSize": 100})
if data.get("data"):
    for item in data["data"]:
        rid = item["id"]
        s = api_delete(f"/api/desktopRoutes/{rid}")
        print(f"  删除 route id={rid}: {s}")
print("  完成")

# ========== 2. 删除所有 uiSchema 残留 ==========
print("\n=== 删除 uiSchema 残留 ===")
status, data = api_get("/api/uiSchemas:list", {"pageSize": 200})
if data.get("data"):
    for item in data["data"]:
        # 保留 root schema
        name = item.get("name", "")
        uid = item.get("x-uid", "")
        if name == "root":
            print(f"  保留 root schema uid={uid}")
            continue
        s = api_delete(f"/api/uiSchemas/{uid}")
        print(f"  删除 uiSchema uid={uid} name={name}: {s}")
print("  完成")

# ========== 3. 删除自定义角色 ==========
print("\n=== 删除自定义角色 ===")
custom_roles = ["consultant", "coo", "copywriter", "finance", "gm",
                "market", "media_leader", "media_staff", "site_group"]
status, data = api_get("/api/roles:list", {"pageSize": 50})
if data.get("data"):
    for item in data["data"]:
        name = item["name"]
        if name in custom_roles:
            rid = item.get("name", "")
            s = api_delete(f"/api/roles/{name}")
            print(f"  删除角色 {name}: {s}")
print("  完成")

# ========== 4. 删除自定义业务表 ==========
print("\n=== 删除自定义业务表 ===")
custom_tables = [
    "study_intentions", "salaries", "assets", "commission_details",
    "employees", "contracts", "partners", "rebates",
    "follow_up_records", "offers", "document_progress",
    "overseas_service_deals", "websites", "payments",
    "study_abroad_deals", "rental_deals", "clients",
    "applications", "media_performance"
]

for table_name in custom_tables:
    s = api_delete(f"/api/collections/{table_name}")
    print(f"  删除表 {table_name}: {s}")
print("  完成")

# ========== 5. 清理 root uiSchema ==========
print("\n=== 重置 root uiSchema ===")
# 获取 root
status, data = api_get("/api/uiSchemas:get/root")
if data.get("data"):
    root_data = data["data"]
    # 清空 properties
    root_data["properties"] = {}
    s, resp = api_post("/api/uiSchemas:update/root", root_data)
    print(f"  重置 root schema: {s}")

print("\n=== 全部清理完成 ===")
