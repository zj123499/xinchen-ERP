import requests, json

BASE = "http://111.229.72.128:8080"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE"
H = {"Authorization": f"Bearer {TOKEN}"}

collections = [
    "employees", "salaries", "commission_details", "contracts", "students",
    "payments", "follow_up_records", "offers", "enrollment", "partners",
    "applications", "visas", "rebates", "assets", "expenses"
]

for col_name in collections:
    r = requests.get(f"{BASE}/api/collections/{col_name}/fields:list", params={"pageSize": 50}, headers=H)
    if r.status_code == 200:
        d = r.json()
        fields = []
        for f in d.get("data", []):
            name = f.get("name", "")
            ftype = f.get("type", "")
            interface = f.get("interface", "")
            target = f.get("target", "")
            info = f"{name}({ftype}"
            if target:
                info += f"->{target}"
            if interface:
                info += f",i:{interface}"
            info += ")"
            fields.append(info)
        print(f"\n{col_name} ({len(fields)} fields):")
        for f in fields:
            print(f"  {f}")
    else:
        print(f"\n{col_name}: ERROR {r.status_code} - {r.text[:100]}")
