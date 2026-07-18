"""
给所有用户补上 username 字段，防止 x-uid 报错
"""
import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# 用户列表和对应 username
users_map = {
    1: "admin",
    3: "zhaojie",
    4: "wuxuejiao",
    5: "zhangnan",
    6: "yaojing",
    7: "qiufeng",
    8: "qinyan",
    9: "wangxiaoke",
    10: "heyujie",
    11: "weijing",
    12: "lvzongyuan",
    13: "xudongqing"
}

for uid, uname in users_map.items():
    r = requests.patch(
        f"{BASE}/api/users/{uid}",
        headers=H,
        json={"username": uname}
    )
    status = "✅" if r.status_code in [200, 201] else f"❌ {r.status_code}"
    print(f"  {status} ID={uid} username={uname}")

print("\n完成。请强制刷新浏览器（Cmd+Shift+R）再试。")
