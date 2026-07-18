import requests, json
BASE = 'http://111.229.72.128:8080'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoiYWRtaW4iLCJpYXQiOjE3ODQwOTY0MzQsImV4cCI6MzMzNDE2OTY0MzR9.XK2f4Wl-nD-U5neYR12ln77PAFilhWUvfvPths1Ov5Q'
H = {'Authorization': f'Bearer {TOKEN}'}

r = requests.get(f'{BASE}/api/leads:list?pageSize=3&page=1&appends%5B%5D=assigned_to&appends%5B%5D=source_partner&appends%5B%5D=source_site', headers=H)
data = r.json()
with open('/tmp/leads_response.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f'Saved. Status: {r.status_code}, Count: {data.get("meta",{}).get("count","?")}, Returned: {len(data.get("data",[]))}')
