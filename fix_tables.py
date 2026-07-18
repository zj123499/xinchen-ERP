"""
修复 leads 和 employees 表
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
        print(f"  ❌ {r.status_code}: {json.dumps(resp, ensure_ascii=False)[:500]}")
        return None
    print(f"  ✅ OK")
    return resp.get("data", resp)

# 1. 线索录入 - 修复 sequence 类型
print("修复 1. leads 线索录入...")
leads = {
    "name": "leads",
    "title": "线索录入",
    "fields": [
        {"name": "lead_id", "type": "sequence", "interface": "sequence", "uiSchema": {"title": "线索编号", "type": "string", "x-component": "CollectionField"}, "patterns": [{"type": "integer", "digits": 6, "start": 1}]},
        {"name": "name", "type": "string", "interface": "input", "uiSchema": {"title": "学生姓名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "phone", "type": "string", "interface": "input", "uiSchema": {"title": "联系电话", "type": "string", "x-component": "Input"}},
        {"name": "wechat", "type": "string", "interface": "input", "uiSchema": {"title": "微信", "type": "string", "x-component": "Input"}},
        {"name": "gender", "type": "string", "interface": "select", "uiSchema": {"title": "性别", "type": "string", "x-component": "Select", "enum": [
            {"value": "男", "label": "男"}, {"value": "女", "label": "女"}
        ]}},
        {"name": "birthday", "type": "date", "interface": "datetime", "uiSchema": {"title": "出生日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "source", "type": "string", "interface": "select", "uiSchema": {"title": "线索来源", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "抖音", "label": "抖音"}, {"value": "视频号", "label": "视频号"},
            {"value": "公众号", "label": "公众号"}, {"value": "小红书", "label": "小红书"},
            {"value": "知乎", "label": "知乎"}, {"value": "今日头条", "label": "今日头条"},
            {"value": "口碑介绍", "label": "口碑介绍"}, {"value": "合作方", "label": "合作方"},
            {"value": "站群", "label": "站群"}, {"value": "GEO", "label": "GEO"},
            {"value": "直播", "label": "直播"}
        ]}},
        {"name": "business_type", "type": "string", "interface": "select", "uiSchema": {"title": "业务方向", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "留学", "label": "留学"}, {"value": "租房", "label": "租房"}, {"value": "境外服务", "label": "境外服务"}
        ]}},
        {"name": "source_partner", "type": "belongsTo", "target": "partners", "interface": "m2o", "uiSchema": {"title": "来源合作方", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}}},
        {"name": "source_site", "type": "belongsTo", "target": "sites", "interface": "m2o", "uiSchema": {"title": "来源网站", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}}},
        {"name": "education", "type": "string", "interface": "select", "uiSchema": {"title": "当前学历", "type": "string", "x-component": "Select", "enum": [
            {"value": "高中", "label": "高中"}, {"value": "本科", "label": "本科"},
            {"value": "硕士", "label": "硕士"}, {"value": "博士", "label": "博士"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "intended_countries", "type": "array", "interface": "multipleSelect", "uiSchema": {"title": "意向国家", "type": "string", "x-component": "Select", "x-component-props": {"mode": "multiple"}, "enum": [
            {"value": "新加坡", "label": "新加坡"}, {"value": "马来西亚", "label": "马来西亚"},
            {"value": "英国", "label": "英国"}, {"value": "澳洲", "label": "澳洲"},
            {"value": "美国", "label": "美国"}, {"value": "加拿大", "label": "加拿大"},
            {"value": "日本", "label": "日本"}, {"value": "韩国", "label": "韩国"},
            {"value": "欧洲其他", "label": "欧洲其他"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "intended_school", "type": "text", "interface": "textarea", "uiSchema": {"title": "意向院校", "type": "string", "x-component": "Input.TextArea"}},
        {"name": "intended_major", "type": "text", "interface": "textarea", "uiSchema": {"title": "意向专业", "type": "string", "x-component": "Input.TextArea"}},
        {"name": "student_status", "type": "string", "interface": "select", "uiSchema": {"title": "学生状态", "type": "string", "x-component": "Select", "required": True, "default": "新线索", "enum": [
            {"value": "新线索", "label": "新线索"}, {"value": "跟进中", "label": "跟进中"},
            {"value": "已签约", "label": "已签约"}, {"value": "已入学", "label": "已入学"},
            {"value": "已完结", "label": "已完结"}, {"value": "无效", "label": "无效"}
        ]}},
        {"name": "assigned_to", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "归属顾问", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
api_post("/api/collections:create", leads)

# 10. 员工信息 - 修复 email 类型
print("修复 10. employees 员工信息...")
employees = {
    "name": "employees",
    "title": "员工信息",
    "fields": [
        {"name": "user", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "系统用户", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "dingtalk_id", "type": "string", "interface": "input", "uiSchema": {"title": "钉钉ID", "type": "string", "x-component": "Input"}},
        {"name": "employee_no", "type": "string", "interface": "input", "uiSchema": {"title": "工号", "type": "string", "x-component": "Input"}},
        {"name": "name", "type": "string", "interface": "input", "uiSchema": {"title": "姓名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "position", "type": "string", "interface": "select", "uiSchema": {"title": "岗位", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "留学顾问", "label": "留学顾问"}, {"value": "市场", "label": "市场"},
            {"value": "新媒体组长", "label": "新媒体组长"}, {"value": "运营专员", "label": "运营专员"},
            {"value": "文案", "label": "文案"}, {"value": "运营总监", "label": "运营总监"},
            {"value": "总经理", "label": "总经理"}, {"value": "会计", "label": "会计"},
            {"value": "站群", "label": "站群"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "base_salary", "type": "double", "interface": "number", "uiSchema": {"title": "底薪", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}, "required": True}},
        {"name": "performance_salary", "type": "double", "interface": "number", "uiSchema": {"title": "绩效工资", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "phone", "type": "string", "interface": "input", "uiSchema": {"title": "手机号", "type": "string", "x-component": "Input"}},
        {"name": "email", "type": "string", "interface": "email", "uiSchema": {"title": "邮箱", "type": "string", "x-component": "Input"}},
        {"name": "department", "type": "string", "interface": "input", "uiSchema": {"title": "部门", "type": "string", "x-component": "Input"}},
        {"name": "bank_name", "type": "string", "interface": "input", "uiSchema": {"title": "开户行", "type": "string", "x-component": "Input"}},
        {"name": "bank_account", "type": "string", "interface": "input", "uiSchema": {"title": "银行卡号", "type": "string", "x-component": "Input"}},
        {"name": "entry_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "入职日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "status", "type": "string", "interface": "select", "uiSchema": {"title": "状态", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "在职", "label": "在职"}, {"value": "离职", "label": "离职"}
        ]}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
api_post("/api/collections:create", employees)

print("\n=== 修复完成 ===")
