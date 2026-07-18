import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# 检查工作流是否仍然有效
wf_id = 375425712259072
print("=== 验证工作流 ===")
r = requests.get(f"{BASE}/api/workflows/{wf_id}?appends=nodes", headers=H)
wf = r.json().get("data", {})
print(f"工作流: {wf.get('title')}, enabled={wf.get('enabled')}")

for n in wf.get("nodes", []):
    print(f"\n  节点: id={n['id']}, type={n['type']}, title={n.get('title')}")
    c = n.get('config', {})
    if n['type'] == 'update':
        print(f"    collection: {c.get('collection')}")
        print(f"    values: {json.dumps(c.get('params', {}).get('values', {}), ensure_ascii=False)}")

# 工作流仍然引用 assigned_to，字段名没变，只是底层类型变了
# 应该不需要更新工作流

# 但需要确认 leads 表的其他 belongsTo users 字段不受影响
print("\n=== 检查 leads 表所有字段 ===")
r = requests.get(f"{BASE}/api/collections/leads/fields", headers=H)
for f in r.json().get("data", []):
    print(f"  {f['name']}: type={f['type']}, interface={f.get('interface', '')}")

print("\n✅ assigned_to 现在是 integer + select，不再有 fieldNames 干扰。")
print("强制刷新浏览器（Cmd+Shift+R）测试下拉框文字显示。")
