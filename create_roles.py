"""
创建角色并分配用户
"""
import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def api_post(path, data):
    r = requests.post(f"{BASE}{path}", headers=H, json=data)
    resp = r.json() if r.text else {}
    if r.status_code not in [200, 201]:
        print(f"  ❌ {r.status_code}: {json.dumps(resp, ensure_ascii=False)[:300]}")
        return None
    print(f"  ✅ OK")
    return resp.get("data", resp)

def api_put(path, data):
    r = requests.put(f"{BASE}{path}", headers=H, json=data)
    resp = r.json() if r.text else {}
    if r.status_code not in [200, 201]:
        print(f"  ❌ {r.status_code}: {json.dumps(resp, ensure_ascii=False)[:300]}")
        return None
    print(f"  ✅ OK")
    return resp.get("data", resp)

# 用户ID映射
users = {
    "赵杰": 3, "吴雪娇": 4, "张楠": 5, "姚静": 6,
    "邱枫": 7, "秦燕": 8, "王小可": 9, "何雨洁": 10,
    "韦静": 11, "吕宗远": 12, "许冬青": 13
}

# 创建角色
roles_map = {
    "gm": {"title": "总经理", "users": ["赵杰"]},
    "director": {"title": "运营总监", "users": ["吴雪娇"]},
    "consultant": {"title": "留学顾问", "users": ["张楠", "姚静"]},
    "market": {"title": "市场", "users": ["邱枫"]},
    "media_leader": {"title": "新媒体组长", "users": ["秦燕"]},
    "media_staff": {"title": "新媒体专员", "users": ["王小可", "何雨洁"]},
    "copywriter": {"title": "文书老师", "users": ["韦静"]},
    "site_manager": {"title": "站群负责人", "users": ["吕宗远"]},
    "finance": {"title": "财务", "users": ["许冬青"]},
}

print("=== 创建角色 ===")
for role_name, role_info in roles_map.items():
    print(f"\n创建角色: {role_name} ({role_info['title']})")
    
    # 创建角色
    result = api_post("/api/roles:create", {
        "name": role_name,
        "title": role_info["title"],
        "allowConfigure": False,
        "allowNewMenu": False,
        "snippets": ["!ui.*", "!pm", "!pm.*"],
        "strategy": {"actions": {}},
    })
    if not result:
        continue
    
    # 获取创建的角色名
    created_role_name = result.get("name", role_name)
    
    # 分配用户到角色
    for user_name in role_info["users"]:
        uid = users.get(user_name)
        if not uid:
            print(f"  跳过用户 {user_name}: 未找到")
            continue
        
        # 更新用户角色
        r = requests.get(f"{BASE}/api/users/{uid}?appends=roles", headers=H)
        if r.status_code == 200:
            user_data = r.json().get("data", {})
            existing_roles = user_data.get("roles", [])
            existing_role_names = [r.get("name") for r in existing_roles if r]
            
            if created_role_name not in existing_role_names:
                existing_role_names.append(created_role_name)
            
            api_put(f"/api/users/{uid}", {
                "roles": existing_role_names
            })
            print(f"  分配用户 {user_name}(id={uid}) → {created_role_name}")

print("\n=== 角色创建完成 ===")
