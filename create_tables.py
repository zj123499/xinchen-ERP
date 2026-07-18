"""
新辰业务管理系统 — 建表脚本
NocoBase API 批量创建所有数据表
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
    return resp.get("data", resp)

# ==================== 辅助表 ====================

# A. 合作方管理
print("创建 A. partners 合作方管理...")
partners = {
    "name": "partners",
    "title": "合作方管理",
    "fields": [
        {"name": "name", "type": "string", "interface": "input", "uiSchema": {"title": "合作方名称", "type": "string", "x-component": "Input", "required": True}},
        {"name": "partner_type", "type": "string", "interface": "select", "uiSchema": {"title": "合作方类型", "type": "string", "x-component": "Select", "enum": [
            {"value": "院校", "label": "院校"}, {"value": "中介", "label": "中介"},
            {"value": "语言学校", "label": "语言学校"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "country", "type": "string", "interface": "select", "uiSchema": {"title": "所属国家", "type": "string", "x-component": "Select", "enum": [
            {"value": "新加坡", "label": "新加坡"}, {"value": "马来西亚", "label": "马来西亚"},
            {"value": "英国", "label": "英国"}, {"value": "澳洲", "label": "澳洲"},
            {"value": "美国", "label": "美国"}, {"value": "加拿大", "label": "加拿大"},
            {"value": "日本", "label": "日本"}, {"value": "韩国", "label": "韩国"},
            {"value": "欧洲其他", "label": "欧洲其他"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "contact_name", "type": "string", "interface": "input", "uiSchema": {"title": "联系人", "type": "string", "x-component": "Input"}},
        {"name": "contact_phone", "type": "string", "interface": "input", "uiSchema": {"title": "联系电话", "type": "string", "x-component": "Input"}},
        {"name": "contact_wechat", "type": "string", "interface": "input", "uiSchema": {"title": "联系微信", "type": "string", "x-component": "Input"}},
        {"name": "has_commission", "type": "boolean", "interface": "boolean", "uiSchema": {"title": "是否有返佣", "type": "boolean", "x-component": "Checkbox"}},
        {"name": "commission_rate", "type": "float", "interface": "percent", "uiSchema": {"title": "返佣比例", "type": "string", "x-component": "Percent"}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", partners)
print(f"  ✅ partners" if r else f"  ❌ failed")

# B. 站群管理
print("创建 B. sites 站群管理...")
sites = {
    "name": "sites",
    "title": "站群管理",
    "fields": [
        {"name": "name", "type": "string", "interface": "input", "uiSchema": {"title": "网站名称", "type": "string", "x-component": "Input", "required": True}},
        {"name": "domain", "type": "string", "interface": "input", "uiSchema": {"title": "域名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "site_type", "type": "string", "interface": "select", "uiSchema": {"title": "网站类型", "type": "string", "x-component": "Select", "enum": [
            {"value": "主站", "label": "主站"}, {"value": "院校站", "label": "院校站"}
        ]}},
        {"name": "icp_company", "type": "string", "interface": "input", "uiSchema": {"title": "备案公司", "type": "string", "x-component": "Input"}},
        {"name": "legal_person", "type": "string", "interface": "input", "uiSchema": {"title": "公司法人", "type": "string", "x-component": "Input"}},
        {"name": "contact_phone", "type": "string", "interface": "input", "uiSchema": {"title": "联系电话", "type": "string", "x-component": "Input"}},
        {"name": "server", "type": "string", "interface": "input", "uiSchema": {"title": "服务器", "type": "string", "x-component": "Input"}},
        {"name": "server_account", "type": "string", "interface": "input", "uiSchema": {"title": "服务器账号", "type": "string", "x-component": "Input"}},
        {"name": "server_password", "type": "string", "interface": "input", "uiSchema": {"title": "服务器密码", "type": "string", "x-component": "Input"}},
        {"name": "server_expiry", "type": "date", "interface": "datetime", "uiSchema": {"title": "服务器续期时间", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "domain_expiry", "type": "date", "interface": "datetime", "uiSchema": {"title": "域名有效期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "status", "type": "string", "interface": "select", "uiSchema": {"title": "状态", "type": "string", "x-component": "Select", "enum": [
            {"value": "运营中", "label": "运营中"}, {"value": "维护中", "label": "维护中"}, {"value": "已停用", "label": "已停用"}
        ]}},
        {"name": "manager", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "负责人", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", sites)
print(f"  ✅ sites" if r else f"  ❌ failed")

# ==================== 业务表 ====================

# 1. 线索录入
print("创建 1. leads 线索录入...")
leads = {
    "name": "leads",
    "title": "线索录入",
    "fields": [
        {"name": "lead_id", "type": "sequence", "interface": "sequence", "uiSchema": {"title": "线索编号", "type": "string", "x-component": "CollectionField", "x-component-props": {"pattern": "string", "start": 1, "digits": 6}}},
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
r = api_post("/api/collections:create", leads)
print(f"  ✅ leads" if r else f"  ❌ failed")

# 2. 顾问跟进
print("创建 2. follow_ups 顾问跟进...")
follow_ups = {
    "name": "follow_ups",
    "title": "顾问跟进",
    "fields": [
        {"name": "lead", "type": "belongsTo", "target": "leads", "interface": "m2o", "uiSchema": {"title": "关联线索", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "student_name", "type": "string", "interface": "input", "uiSchema": {"title": "学生姓名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "phone", "type": "string", "interface": "input", "uiSchema": {"title": "联系电话", "type": "string", "x-component": "Input"}},
        {"name": "wechat", "type": "string", "interface": "input", "uiSchema": {"title": "微信", "type": "string", "x-component": "Input"}},
        {"name": "gender", "type": "string", "interface": "select", "uiSchema": {"title": "性别", "type": "string", "x-component": "Select", "enum": [
            {"value": "男", "label": "男"}, {"value": "女", "label": "女"}
        ]}},
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
        {"name": "apply_country", "type": "string", "interface": "select", "uiSchema": {"title": "申请国家", "type": "string", "x-component": "Select", "enum": [
            {"value": "新加坡", "label": "新加坡"}, {"value": "马来西亚", "label": "马来西亚"},
            {"value": "英国", "label": "英国"}, {"value": "澳洲", "label": "澳洲"},
            {"value": "美国", "label": "美国"}, {"value": "加拿大", "label": "加拿大"},
            {"value": "日本", "label": "日本"}, {"value": "韩国", "label": "韩国"},
            {"value": "欧洲其他", "label": "欧洲其他"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "apply_school", "type": "string", "interface": "input", "uiSchema": {"title": "申请院校", "type": "string", "x-component": "Input"}},
        {"name": "apply_major", "type": "string", "interface": "input", "uiSchema": {"title": "申请专业", "type": "string", "x-component": "Input"}},
        {"name": "student_status", "type": "string", "interface": "select", "uiSchema": {"title": "学生状态", "type": "string", "x-component": "Select", "required": True, "default": "新线索", "enum": [
            {"value": "新线索", "label": "新线索"}, {"value": "跟进中", "label": "跟进中"},
            {"value": "已签约", "label": "已签约"}, {"value": "已入学", "label": "已入学"},
            {"value": "已完结", "label": "已完结"}, {"value": "无效", "label": "无效"}
        ]}},
        {"name": "follow_record", "type": "text", "interface": "textarea", "uiSchema": {"title": "跟进记录", "type": "string", "x-component": "Input.TextArea"}},
        {"name": "next_follow_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "下次跟进日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "assist_consultant", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "协助顾问", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}}},
        {"name": "follow_by", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "跟进人", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", follow_ups)
print(f"  ✅ follow_ups" if r else f"  ❌ failed")

# 3. 文书客户
print("创建 3. copywriter_clients 文书客户...")
copywriter_clients = {
    "name": "copywriter_clients",
    "title": "文书客户",
    "fields": [
        {"name": "lead", "type": "belongsTo", "target": "leads", "interface": "m2o", "uiSchema": {"title": "关联线索", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "student_name", "type": "string", "interface": "input", "uiSchema": {"title": "学生姓名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "phone", "type": "string", "interface": "input", "uiSchema": {"title": "联系电话", "type": "string", "x-component": "Input"}},
        {"name": "wechat", "type": "string", "interface": "input", "uiSchema": {"title": "微信", "type": "string", "x-component": "Input"}},
        {"name": "apply_country", "type": "string", "interface": "select", "uiSchema": {"title": "申请国家", "type": "string", "x-component": "Select", "enum": [
            {"value": "新加坡", "label": "新加坡"}, {"value": "马来西亚", "label": "马来西亚"},
            {"value": "英国", "label": "英国"}, {"value": "澳洲", "label": "澳洲"},
            {"value": "美国", "label": "美国"}, {"value": "加拿大", "label": "加拿大"},
            {"value": "日本", "label": "日本"}, {"value": "韩国", "label": "韩国"},
            {"value": "欧洲其他", "label": "欧洲其他"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "apply_school", "type": "string", "interface": "input", "uiSchema": {"title": "申请院校", "type": "string", "x-component": "Input"}},
        {"name": "apply_major", "type": "string", "interface": "input", "uiSchema": {"title": "申请专业", "type": "string", "x-component": "Input"}},
        {"name": "assigned_consultant", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "归属顾问", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}}},
        {"name": "status", "type": "string", "interface": "select", "uiSchema": {"title": "文书状态", "type": "string", "x-component": "Select", "required": True, "default": "待启动", "enum": [
            {"value": "待启动", "label": "待启动"}, {"value": "材料收集中", "label": "材料收集中"},
            {"value": "文书撰写中", "label": "文书撰写中"}, {"value": "已递交", "label": "已递交"},
            {"value": "已完成", "label": "已完成"}
        ]}},
        {"name": "assigned_to", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "文书老师", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", copywriter_clients)
print(f"  ✅ copywriter_clients" if r else f"  ❌ failed")

# 4. 合同管理
print("创建 4. contracts 合同管理...")
contracts = {
    "name": "contracts",
    "title": "合同管理",
    "fields": [
        {"name": "lead", "type": "belongsTo", "target": "leads", "interface": "m2o", "uiSchema": {"title": "关联线索", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "student_name", "type": "string", "interface": "input", "uiSchema": {"title": "学生姓名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "deal_type", "type": "string", "interface": "select", "uiSchema": {"title": "业务类型", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "留学", "label": "留学"}, {"value": "租房", "label": "租房"}, {"value": "境外服务", "label": "境外服务"}
        ]}},
        {"name": "source_channel", "type": "string", "interface": "select", "uiSchema": {"title": "来源渠道", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "新媒体", "label": "新媒体"}, {"value": "站群", "label": "站群"},
            {"value": "GEO", "label": "GEO"}, {"value": "口碑介绍", "label": "口碑介绍"},
            {"value": "合作方", "label": "合作方"}, {"value": "直播", "label": "直播"}
        ]}},
        {"name": "partner", "type": "belongsTo", "target": "partners", "interface": "m2o", "uiSchema": {"title": "合作方", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}}},
        {"name": "service_fee", "type": "double", "interface": "number", "uiSchema": {"title": "服务费总额", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}, "required": True}},
        {"name": "deposit", "type": "double", "interface": "number", "uiSchema": {"title": "保证金", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元", "defaultValue": 2000}}},
        {"name": "sign_method", "type": "string", "interface": "select", "uiSchema": {"title": "签约形式", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "线上", "label": "线上（爱签）"}, {"value": "线下", "label": "线下"}
        ]}},
        {"name": "sign_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "签约日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}, "required": True}},
        {"name": "status", "type": "string", "interface": "select", "uiSchema": {"title": "签约状态", "type": "string", "x-component": "Select", "required": True, "default": "已签约", "enum": [
            {"value": "已签约", "label": "已签约"}, {"value": "申请中", "label": "申请中"},
            {"value": "部分录取", "label": "部分录取"}, {"value": "全部录取", "label": "全部录取"},
            {"value": "已入学", "label": "已入学"}, {"value": "已完结", "label": "已完结"},
            {"value": "已退款", "label": "已退款"}
        ]}},
        {"name": "assigned_to", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "归属顾问", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "assist_consultant", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "协助顾问", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", contracts)
print(f"  ✅ contracts" if r else f"  ❌ failed")

# 5. 申请跟进
print("创建 5. application_follow 申请跟进...")
application_follow = {
    "name": "application_follow",
    "title": "申请跟进",
    "fields": [
        {"name": "contract", "type": "belongsTo", "target": "contracts", "interface": "m2o", "uiSchema": {"title": "关联合同", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "student_name", "type": "string", "interface": "input", "uiSchema": {"title": "学生姓名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "country", "type": "string", "interface": "select", "uiSchema": {"title": "申请国家", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "新加坡", "label": "新加坡"}, {"value": "马来西亚", "label": "马来西亚"},
            {"value": "英国", "label": "英国"}, {"value": "澳洲", "label": "澳洲"},
            {"value": "美国", "label": "美国"}, {"value": "加拿大", "label": "加拿大"},
            {"value": "日本", "label": "日本"}, {"value": "韩国", "label": "韩国"},
            {"value": "欧洲其他", "label": "欧洲其他"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "school_name", "type": "string", "interface": "input", "uiSchema": {"title": "申请院校", "type": "string", "x-component": "Input", "required": True}},
        {"name": "major", "type": "string", "interface": "input", "uiSchema": {"title": "申请专业", "type": "string", "x-component": "Input", "required": True}},
        {"name": "degree", "type": "string", "interface": "select", "uiSchema": {"title": "学位层级", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "本科", "label": "本科"}, {"value": "硕士", "label": "硕士"},
            {"value": "博士", "label": "博士"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "material_status", "type": "string", "interface": "select", "uiSchema": {"title": "材料状态", "type": "string", "x-component": "Select", "enum": [
            {"value": "待收集", "label": "待收集"}, {"value": "收集中", "label": "收集中"}, {"value": "已齐全", "label": "已齐全"}
        ]}},
        {"name": "material_notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "材料备注", "type": "string", "x-component": "Input.TextArea"}},
        {"name": "visa_status", "type": "string", "interface": "select", "uiSchema": {"title": "签证状态", "type": "string", "x-component": "Select", "enum": [
            {"value": "未申请", "label": "未申请"}, {"value": "申请中", "label": "申请中"},
            {"value": "通过", "label": "通过"}, {"value": "拒绝", "label": "拒绝"}
        ]}},
        {"name": "visa_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "签证日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "offer_result", "type": "string", "interface": "select", "uiSchema": {"title": "Offer结果", "type": "string", "x-component": "Select", "enum": [
            {"value": "等待中", "label": "等待中"}, {"value": "有条件录取", "label": "有条件录取"},
            {"value": "录取", "label": "录取"}, {"value": "拒绝", "label": "拒绝"},
            {"value": "已放弃", "label": "已放弃"}
        ]}},
        {"name": "offer_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "Offer日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "enrollment_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "入学日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "close_status", "type": "string", "interface": "select", "uiSchema": {"title": "结案状态", "type": "string", "x-component": "Select", "enum": [
            {"value": "未结案", "label": "未结案"}, {"value": "已结案", "label": "已结案"}
        ]}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", application_follow)
print(f"  ✅ application_follow" if r else f"  ❌ failed")

# 6. 租房订单
print("创建 6. rental_orders 租房订单...")
rental_orders = {
    "name": "rental_orders",
    "title": "租房订单",
    "fields": [
        {"name": "contract", "type": "belongsTo", "target": "contracts", "interface": "m2o", "uiSchema": {"title": "关联合同", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "student_name", "type": "string", "interface": "input", "uiSchema": {"title": "学生姓名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "client_type", "type": "string", "interface": "select", "uiSchema": {"title": "客户类型", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "B端", "label": "B端"}, {"value": "C端", "label": "C端"}
        ]}},
        {"name": "address", "type": "string", "interface": "input", "uiSchema": {"title": "租房地址", "type": "string", "x-component": "Input"}},
        {"name": "monthly_rent", "type": "double", "interface": "number", "uiSchema": {"title": "月租金", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "lease_term", "type": "string", "interface": "select", "uiSchema": {"title": "租期", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "3个月", "label": "3个月"}, {"value": "半年", "label": "半年"}, {"value": "一年", "label": "一年"}
        ]}},
        {"name": "commission_income", "type": "double", "interface": "number", "uiSchema": {"title": "佣金收入", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "commission_settle_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "佣金结算日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "move_in_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "入住日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "property_manager", "type": "string", "interface": "input", "uiSchema": {"title": "房管归属", "type": "string", "x-component": "Input"}},
        {"name": "status", "type": "string", "interface": "select", "uiSchema": {"title": "状态", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "咨询中", "label": "咨询中"}, {"value": "已预定", "label": "已预定"},
            {"value": "已入住", "label": "已入住"}, {"value": "已续约", "label": "已续约"},
            {"value": "已退租", "label": "已退租"}, {"value": "已取消", "label": "已取消"}
        ]}},
        {"name": "assigned_to", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "归属顾问", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", rental_orders)
print(f"  ✅ rental_orders" if r else f"  ❌ failed")

# 7. 境外服务
print("创建 7. overseas_services 境外服务...")
overseas_services = {
    "name": "overseas_services",
    "title": "境外服务",
    "fields": [
        {"name": "contract", "type": "belongsTo", "target": "contracts", "interface": "m2o", "uiSchema": {"title": "关联合同", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "student_name", "type": "string", "interface": "input", "uiSchema": {"title": "学生姓名", "type": "string", "x-component": "Input", "required": True}},
        {"name": "service_type", "type": "string", "interface": "select", "uiSchema": {"title": "服务类型", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "新加坡接机", "label": "新加坡接机"}, {"value": "新加坡接机+陪同", "label": "新加坡接机+陪同"},
            {"value": "马来西亚接机+陪同", "label": "马来西亚接机+陪同"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "service_fee", "type": "double", "interface": "number", "uiSchema": {"title": "服务费", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}, "required": True}},
        {"name": "country", "type": "string", "interface": "select", "uiSchema": {"title": "服务国家", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "新加坡", "label": "新加坡"}, {"value": "马来西亚", "label": "马来西亚"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "service_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "服务日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "status", "type": "string", "interface": "select", "uiSchema": {"title": "状态", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "待安排", "label": "待安排"}, {"value": "已安排", "label": "已安排"},
            {"value": "服务中", "label": "服务中"}, {"value": "已完成", "label": "已完成"},
            {"value": "已取消", "label": "已取消"}
        ]}},
        {"name": "assigned_to", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "归属顾问", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", overseas_services)
print(f"  ✅ overseas_services" if r else f"  ❌ failed")

# 8. 新媒体账号
print("创建 8. media_accounts 新媒体账号...")
media_accounts = {
    "name": "media_accounts",
    "title": "新媒体账号",
    "fields": [
        {"name": "platform", "type": "string", "interface": "select", "uiSchema": {"title": "平台", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "抖音", "label": "抖音"}, {"value": "视频号", "label": "视频号"},
            {"value": "公众号", "label": "公众号"}, {"value": "小红书", "label": "小红书"},
            {"value": "知乎", "label": "知乎"}, {"value": "今日头条", "label": "今日头条"},
            {"value": "其他", "label": "其他"}
        ]}},
        {"name": "account_name", "type": "string", "interface": "input", "uiSchema": {"title": "账号名称", "type": "string", "x-component": "Input", "required": True}},
        {"name": "account_id", "type": "string", "interface": "input", "uiSchema": {"title": "账号ID", "type": "string", "x-component": "Input"}},
        {"name": "persona", "type": "string", "interface": "input", "uiSchema": {"title": "人设", "type": "string", "x-component": "Input"}},
        {"name": "cert_company", "type": "string", "interface": "input", "uiSchema": {"title": "认证公司", "type": "string", "x-component": "Input"}},
        {"name": "bind_phone", "type": "string", "interface": "input", "uiSchema": {"title": "绑定手机", "type": "string", "x-component": "Input"}},
        {"name": "phone_real_name", "type": "string", "interface": "input", "uiSchema": {"title": "手机实名", "type": "string", "x-component": "Input"}},
        {"name": "phone_status", "type": "string", "interface": "select", "uiSchema": {"title": "手机号状态", "type": "string", "x-component": "Select", "enum": [
            {"value": "正常", "label": "正常"}, {"value": "停机", "label": "停机"},
            {"value": "欠费", "label": "欠费"}, {"value": "已注销", "label": "已注销"}
        ]}},
        {"name": "owner", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "负责人", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "status", "type": "string", "interface": "select", "uiSchema": {"title": "状态", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "运营中", "label": "运营中"}, {"value": "暂停", "label": "暂停"}, {"value": "停用", "label": "停用"}
        ]}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", media_accounts)
print(f"  ✅ media_accounts" if r else f"  ❌ failed")

# 9. 新媒体业绩
print("创建 9. media_performance 新媒体业绩...")
media_performance = {
    "name": "media_performance",
    "title": "新媒体业绩",
    "fields": [
        {"name": "employee", "type": "belongsTo", "target": "users", "interface": "m2o", "uiSchema": {"title": "员工", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "role", "type": "string", "interface": "select", "uiSchema": {"title": "岗位角色", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "新媒体组长", "label": "新媒体组长"}, {"value": "运营专员", "label": "运营专员"}
        ]}},
        {"name": "record_month", "type": "string", "interface": "month", "uiSchema": {"title": "记录月份", "type": "string", "x-component": "MonthPicker", "required": True}},
        {"name": "view_count", "type": "integer", "interface": "number", "uiSchema": {"title": "播放量/阅读量", "type": "number", "x-component": "InputNumber"}},
        {"name": "clue_count", "type": "integer", "interface": "number", "uiSchema": {"title": "月线索量", "type": "number", "x-component": "InputNumber"}},
        {"name": "deal_count", "type": "integer", "interface": "number", "uiSchema": {"title": "成交单数", "type": "number", "x-component": "InputNumber"}},
        {"name": "view_bonus", "type": "double", "interface": "number", "uiSchema": {"title": "播放量奖金", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "clue_bonus", "type": "double", "interface": "number", "uiSchema": {"title": "线索量奖金", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "deal_bonus", "type": "double", "interface": "number", "uiSchema": {"title": "成交提成", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "team_bonus", "type": "double", "interface": "number", "uiSchema": {"title": "团队奖金", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "total_commission", "type": "double", "interface": "number", "uiSchema": {"title": "合计提成", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", media_performance)
print(f"  ✅ media_performance" if r else f"  ❌ failed")

# 10. 员工信息
print("创建 10. employees 员工信息...")
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
        {"name": "email", "type": "email", "interface": "email", "uiSchema": {"title": "邮箱", "type": "string", "x-component": "Input"}},
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
r = api_post("/api/collections:create", employees)
print(f"  ✅ employees" if r else f"  ❌ failed")

# 11. 薪资管理
print("创建 11. salaries 薪资管理...")
salaries = {
    "name": "salaries",
    "title": "薪资管理",
    "fields": [
        {"name": "employee", "type": "belongsTo", "target": "employees", "interface": "m2o", "uiSchema": {"title": "员工", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "year_month", "type": "string", "interface": "month", "uiSchema": {"title": "薪资月份", "type": "string", "x-component": "MonthPicker", "required": True}},
        {"name": "base_salary", "type": "double", "interface": "number", "uiSchema": {"title": "底薪", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}, "required": True}},
        {"name": "performance_salary", "type": "double", "interface": "number", "uiSchema": {"title": "绩效工资", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "study_commission", "type": "double", "interface": "number", "uiSchema": {"title": "留学提成", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "rental_commission", "type": "double", "interface": "number", "uiSchema": {"title": "租房提成", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "overseas_commission", "type": "double", "interface": "number", "uiSchema": {"title": "境外服务提成", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "media_commission", "type": "double", "interface": "number", "uiSchema": {"title": "新媒体提成", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "team_bonus", "type": "double", "interface": "number", "uiSchema": {"title": "团队奖金", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "other_bonus", "type": "double", "interface": "number", "uiSchema": {"title": "其他奖金", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "deduction", "type": "double", "interface": "number", "uiSchema": {"title": "扣款", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "net_salary", "type": "double", "interface": "number", "uiSchema": {"title": "实发工资", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "status", "type": "string", "interface": "select", "uiSchema": {"title": "状态", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "待核算", "label": "待核算"}, {"value": "已确认", "label": "已确认"}, {"value": "已发放", "label": "已发放"}
        ]}},
        {"name": "paid_date", "type": "date", "interface": "datetime", "uiSchema": {"title": "发放日期", "type": "string", "x-component": "DatePicker", "x-component-props": {"showTime": False}}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "备注", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", salaries)
print(f"  ✅ salaries" if r else f"  ❌ failed")

# 12. 提成明细
print("创建 12. commissions 提成明细...")
commissions = {
    "name": "commissions",
    "title": "提成明细",
    "fields": [
        {"name": "employee", "type": "belongsTo", "target": "employees", "interface": "m2o", "uiSchema": {"title": "员工", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "salary", "type": "belongsTo", "target": "salaries", "interface": "m2o", "uiSchema": {"title": "关联薪资", "type": "string", "x-component": "Select", "x-component-props": {"objectValue": True}, "required": True}},
        {"name": "commission_type", "type": "string", "interface": "select", "uiSchema": {"title": "提成类型", "type": "string", "x-component": "Select", "required": True, "enum": [
            {"value": "留学签约", "label": "留学签约"}, {"value": "留学Offer", "label": "留学Offer"},
            {"value": "留学入学", "label": "留学入学"}, {"value": "留学返佣", "label": "留学返佣"},
            {"value": "租房", "label": "租房"}, {"value": "境外服务", "label": "境外服务"},
            {"value": "新媒体成交", "label": "新媒体成交"}, {"value": "新媒体播放量", "label": "新媒体播放量"},
            {"value": "新媒体线索量", "label": "新媒体线索量"}, {"value": "团队奖金", "label": "团队奖金"},
            {"value": "渠道推荐", "label": "渠道推荐"}, {"value": "其他", "label": "其他"}
        ]}},
        {"name": "source_record", "type": "string", "interface": "input", "uiSchema": {"title": "来源单号", "type": "string", "x-component": "Input"}},
        {"name": "base_amount", "type": "double", "interface": "number", "uiSchema": {"title": "计算基数", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}}},
        {"name": "rate", "type": "float", "interface": "percent", "uiSchema": {"title": "提成比例", "type": "string", "x-component": "Percent"}},
        {"name": "amount", "type": "double", "interface": "number", "uiSchema": {"title": "提成金额", "type": "number", "x-component": "InputNumber", "x-component-props": {"addonAfter": "元"}, "required": True}},
        {"name": "notes", "type": "text", "interface": "textarea", "uiSchema": {"title": "说明", "type": "string", "x-component": "Input.TextArea"}},
    ],
    "createdBy": True, "updatedBy": True, "createdAt": True, "updatedAt": True,
}
r = api_post("/api/collections:create", commissions)
print(f"  ✅ commissions" if r else f"  ❌ failed")

print("\n=== 全部建表完成 ===")
