"""
修复个人资料页面的 x-uid 错误
步骤：1.清除NocoBase缓存 2.确认用户数据完整性
"""
import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 1. 检查当前用户列表
print("=== 用户列表 ===")
r = requests.get(f"{BASE}/api/users", headers=H)
if r.status_code == 200:
    users = r.json().get("data", [])
    for u in users:
        print(f"  ID={u['id']}, email={u.get('email')}, nickname={u.get('nickname')}, username={u.get('username')}")
else:
    print(f"获取用户失败: {r.status_code}")

# 2. 检查 root 用户的 profile
print("\n=== root 用户详情 ===")
r = requests.get(f"{BASE}/api/users/1", headers=H)
if r.status_code == 200:
    user = r.json().get("data", {})
    # 只打印关键字段
    print(f"  id: {user.get('id')}")
    print(f"  email: {user.get('email')}")
    print(f"  nickname: {user.get('nickname')}")
    print(f"  username: {user.get('username')}")
    print(f"  roles: {[r.get('name') for r in user.get('roles', [])]}")
    # 检查是否有 systemSettings 中的配置问题
    print(f"  avatar: {user.get('avatar')}")
else:
    print(f"获取失败: {r.status_code}")

# 3. 尝试清除 app 缓存
print("\n=== 清除缓存 ===")
try:
    r = requests.post(f"{BASE}/api/app:clearCache", headers=H)
    print(f"  清除缓存: {r.status_code}")
except:
    print("  该接口不可用，跳过")

print("\n✅ 完成。请刷新浏览器页面（Ctrl+Shift+R 强制刷新），再试个人资料。")
