"""
用新名字创建月份字段，旧字段已软删除
"""
import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 查看所有字段（包括软删除的）
r = requests.get(f"{BASE}/api/collections/media_performance/fields", headers=H)
fields = r.json().get("data", [])
print("当前字段列表:")
for f in fields:
    print(f"  {f['name']} ({f['key']}) type={f['type']}")

# 创建新字段用新名字
new_field = {
    "name": "month_record",
    "type": "string",
    "interface": "input",
    "uiSchema": {
        "title": "记录月份",
        "type": "string",
        "x-component": "Input",
        "x-component-props": {"placeholder": "如 2026-07"},
        "required": True
    }
}
r = requests.post(f"{BASE}/api/collections/media_performance/fields", headers=H, json=new_field)
print(f"\n创建 month_record: {r.status_code}")
if r.status_code in [200, 201]:
    print("✅ month_record 字段创建成功，显示名为「记录月份」")
else:
    print(r.text[:400])
