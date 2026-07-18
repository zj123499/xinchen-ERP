#!/usr/bin/env python3
"""
NocoBase 界面配置脚本 v4
使用 uiSchemas:insert 一次性插入完整 schema 树（正确的 API）
"""
import requests, json

BASE = 'http://111.229.72.128:8080'
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE'
H = {'Authorization': 'Bearer %s' % TOKEN, 'Content-Type': 'application/json'}


def api_get(path, params=None):
    r = requests.get(BASE + path, headers={'Authorization': 'Bearer %s' % TOKEN}, params=params, timeout=15)
    if r.status_code != 200:
        return {"data": []}
    return r.json()


def api_post(path, data):
    r = requests.post(BASE + path, headers=H, json=data, timeout=30)
    if r.status_code not in [200, 201]:
        print("  POST %s ERROR %d: %s" % (path, r.status_code, r.text[:200]))
        return None
    return r.json()


def api_delete(path):
    r = requests.delete(BASE + path, headers={'Authorization': 'Bearer %s' % TOKEN}, timeout=15)
    return r.status_code


# ============================================================
# Step 1: 清除旧的配置
# ============================================================
print("=" * 60)
print("Step 1: 清除旧的配置")
print("=" * 60)

# 删除 desktopRoutes
routes = api_get('/api/desktopRoutes:list', {"pageSize": 500})
for item in routes.get('data', []):
    api_delete('/api/desktopRoutes/%d' % item.get('id'))
print("  清除 %d 条旧路由" % len(routes.get('data', [])))

# 删除旧 schema
schemas = api_get('/api/uiSchemas:list', {"pageSize": 2000})
our_names = [
    "students-page", "follow-up-page", "contracts-page", "payments-page",
    "rebates-page", "expenses-page", "applications-page", "offers-page",
    "visas-page", "enrollment-page", "employees-page", "salaries-page",
    "commission-page", "partners-page", "assets-page", "dashboard-page",
    "recur-page", "test-page", "test-full", "test-page-2", "test-page-3",
    "page", "grid", "row", "col", "card", "content", "hello",
    "test", "rec", "row1", "col1", "card1",
]
deleted_count = 0
for item in schemas.get('data', []):
    name = item.get('name', '')
    uid = item.get('x-uid', '')
    if name in our_names or name.startswith('test-') or name.startswith('page-test-'):
        if api_delete('/api/uiSchemas/%s' % uid) == 200:
            deleted_count += 1
print("  清除 %d 个旧 schema" % deleted_count)


# ============================================================
# Step 2: 获取表结构
# ============================================================
print("\n" + "=" * 60)
print("Step 2: 获取表结构")
print("=" * 60)

collections_info = {}
tables = [
    "students", "employees", "salaries", "commission_details",
    "contracts", "payments", "follow_up_records", "offers",
    "applications", "visas", "rebates", "partners",
    "enrollment", "assets", "expenses"
]

for tbl in tables:
    d = api_get('/api/collections/%s/fields:list' % tbl, {"pageSize": 50})
    fields = []
    for f in d.get('data', []):
        name = f.get('name', '')
        ftype = f.get('type', '')
        target = f.get('target', '')
        if name in ['id', 'createdAt', 'updatedAt', 'createdById', 'updatedById']:
            continue
        if target and name.endswith('_id') and ftype == 'bigInt':
            has_rel = any(f2.get('type') == 'belongsTo' and f2.get('foreignKey') == name for f2 in d.get('data', []))
            if has_rel:
                continue
        fields.append({'name': name, 'type': ftype, 'target': target})
    collections_info[tbl] = fields
    print("  %s: %d fields" % (tbl, len(fields)))


# ============================================================
# Step 3: 构建并插入页面 schema
# ============================================================
print("\n" + "=" * 60)
print("Step 3: 创建页面 schema（使用 :insert 一次性插入）")
print("=" * 60)


def make_column_props(fields, coll):
    """生成表格列 properties"""
    props = {}
    for i, f in enumerate(fields):
        col_id = "col-%s" % f['name']
        props[col_id] = {
            "type": "void",
            "x-component": "Table.Column",
            "x-designer": "TableColumnDesigner",
            "x-settings": "tableColumnSettings",
            "properties": {
                f['name']: {
                    "type": "string",
                    "x-component": "CollectionField",
                    "x-decorator": "Table.Column.Decorator",
                    "x-collection-field": "%s.%s" % (coll, f['name']),
                    "x-read-pretty": True,
                    "x-designer": "TableColumnFieldDesigner",
                }
            }
        }
    # 操作列
    props["col-actions"] = {
        "type": "void",
        "x-component": "Table.Column",
        "x-designer": "TableColumnDesigner",
        "x-settings": "tableColumnSettings",
        "x-component-props": {"width": 200, "fixed": "right"},
        "properties": {
            "actions": {
                "type": "void",
                "x-component": "ActionBar",
                "x-initializer": "TableColumnActionInitializers",
                "properties": {
                    "view": {
                        "type": "void",
                        "x-action": "view",
                        "x-component": "Action.Link",
                        "x-component-props": {"useAction": "{{ useViewAction }}"},
                        "x-designer": "ActionDesigner",
                        "x-settings": "actionSettings",
                        "properties": {
                            "drawer": {
                                "type": "void",
                                "x-component": "Action.Drawer",
                                "x-component-props": {"width": 700},
                                "properties": {
                                    "details": {
                                        "type": "void",
                                        "x-component": "Details",
                                        "x-use-component-props": "useDetailsBlockProps",
                                        "x-read-pretty": True,
                                        "x-designer": "DetailsDesigner",
                                        "properties": {
                                            "grid": {
                                                "type": "void",
                                                "x-component": "Grid",
                                                "x-component-props": {"cols": 2, "showDivider": False},
                                                "x-initializer": "DetailsItemInitializers",
                                                "properties": {}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "edit": {
                        "type": "void",
                        "x-action": "update",
                        "x-component": "Action.Link",
                        "x-component-props": {"useAction": "{{ useEditAction }}"},
                        "x-designer": "ActionDesigner",
                        "x-settings": "actionSettings",
                        "properties": {
                            "drawer": {
                                "type": "void",
                                "x-component": "Action.Drawer",
                                "x-component-props": {"width": 700},
                                "properties": {
                                    "form": {
                                        "type": "void",
                                        "x-component": "FormV2",
                                        "x-use-component-props": "useEditFormBlockProps",
                                        "properties": {
                                            "grid": {
                                                "type": "void",
                                                "x-component": "Grid",
                                                "x-component-props": {"cols": 2, "showDivider": False},
                                                "x-initializer": "FormItemInitializers",
                                                "properties": {}
                                            },
                                            "footer": {
                                                "type": "void",
                                                "x-component": "Action.Drawer.FootBar",
                                                "properties": {
                                                    "submit": {
                                                        "type": "void",
                                                        "title": "{{ t('Submit') }}",
                                                        "x-component": "Action",
                                                        "x-component-props": {"type": "primary", "htmlType": "submit", "useAction": "{{ useSubmitAction }}"},
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "delete": {
                        "type": "void",
                        "x-action": "destroy",
                        "x-component": "Action.Link",
                        "x-component-props": {
                            "useAction": "{{ useDestroyAction }}",
                            "confirm": {"title": "确认删除", "content": "确定要删除此记录吗？"}
                        },
                        "x-designer": "ActionDesigner",
                    }
                }
            }
        }
    }
    return props


def make_full_page_schema(page_name, page_title, coll):
    """构建完整页面的 schema"""
    fields = collections_info.get(coll, [])
    return {
        "type": "void",
        "name": "page",
        "x-component": "Page",
        "x-component-props": {"headerTitle": page_title},
        "x-designer": "PageDesigner",
        "properties": {
            "grid": {
                "type": "void",
                "x-component": "Grid",
                "x-component-props": {"cols": 1, "rowHeight": 50, "showDivider": False},
                "x-initializer": "BlockInitializers",
                "x-designer": "GridDesigner",
                "properties": {
                    "row": {
                        "type": "void",
                        "x-component": "Grid.Row",
                        "x-designer": "Grid.Row.Designer",
                        "properties": {
                            "col": {
                                "type": "void",
                                "x-component": "Grid.Col",
                                "x-component-props": {"span": 24},
                                "x-designer": "Grid.Col.Designer",
                                "properties": {
                                    "table": {
                                        "type": "void",
                                        "x-component": "Table.V2",
                                        "x-component-props": {
                                            "rowKey": "id",
                                            "useProps": "{{ useTableBlockProps }}",
                                            "useSelectedRows": "{{ useSelectedRows }}",
                                            "bordered": True,
                                            "size": "middle"
                                        },
                                        "x-designer": "TableBlockDesigner",
                                        "x-collection": coll,
                                        "x-use-component-props": "useTableBlockProps",
                                        "x-initializer": "TableColumnInitializers",
                                        "x-settings": "tableSettings",
                                        "properties": {
                                            "actions": {
                                                "type": "void",
                                                "x-component": "ActionBar",
                                                "x-component-props": {"layout": "one-column", "style": {"marginBottom": 16}},
                                                "x-initializer": "TableActionInitializers",
                                                "x-designer": "ActionBarDesigner",
                                                "properties": {
                                                    "add": {
                                                        "type": "void",
                                                        "x-action": "create",
                                                        "x-component": "Action",
                                                        "x-component-props": {"type": "primary", "icon": "PlusOutlined", "useAction": "{{ useCreateAction }}"},
                                                        "x-designer": "ActionDesigner",
                                                        "x-settings": "actionSettings",
                                                        "x-align": "left",
                                                        "properties": {
                                                            "drawer": {
                                                                "type": "void",
                                                                "x-component": "Action.Drawer",
                                                                "x-component-props": {"width": 700},
                                                                "properties": {
                                                                    "form": {
                                                                        "type": "void",
                                                                        "x-component": "FormV2",
                                                                        "x-use-component-props": "useCreateFormBlockProps",
                                                                        "properties": {
                                                                            "grid": {
                                                                                "type": "void",
                                                                                "x-component": "Grid",
                                                                                "x-component-props": {"cols": 2, "showDivider": False},
                                                                                "x-initializer": "FormItemInitializers",
                                                                                "properties": {}
                                                                            },
                                                                            "footer": {
                                                                                "type": "void",
                                                                                "x-component": "Action.Drawer.FootBar",
                                                                                "properties": {
                                                                                    "submit": {
                                                                                        "type": "void",
                                                                                        "title": "{{ t('Submit') }}",
                                                                                        "x-component": "Action",
                                                                                        "x-component-props": {"type": "primary", "htmlType": "submit", "useAction": "{{ useSubmitAction }}"},
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    },
                                                    "delete": {
                                                        "type": "void",
                                                        "x-action": "destroy",
                                                        "x-component": "Action",
                                                        "x-component-props": {"useAction": "{{ useBulkDestroyAction }}"},
                                                        "x-designer": "ActionDesigner",
                                                        "x-settings": "actionSettings",
                                                        "x-align": "left",
                                                    }
                                                }
                                            },
                                            "columns": {
                                                "type": "void",
                                                "x-component": "ArrayTable.Column",
                                                "x-designer": "TableColumnDesigner",
                                                "properties": make_column_props(fields, coll)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }


def make_dashboard_schema():
    """仪表盘 schema"""
    cards = [
        ("students_card", "学生总数", 6, "students"),
        ("contract_card", "合同总金额", 6, "contracts"),
        ("employee_card", "员工总数", 6, "employees"),
        ("salary_card", "薪资总额", 6, "salaries"),
    ]
    grid_props = {}
    for card_name, card_title, span, coll in cards:
        grid_props[card_name] = {
            "type": "void",
            "x-component": "Grid.Row",
            "x-designer": "Grid.Row.Designer",
            "properties": {
                "col": {
                    "type": "void",
                    "x-component": "Grid.Col",
                    "x-component-props": {"span": span},
                    "x-designer": "Grid.Col.Designer",
                    "properties": {
                        "card": {
                            "type": "void",
                            "x-component": "CardItem",
                            "x-designer": "CardItemDesigner",
                            "properties": {
                                "statistic": {
                                    "type": "void",
                                    "x-component": "Statistic",
                                    "x-component-props": {"title": card_title},
                                    "x-collection": coll,
                                    "x-use-component-props": "useStatisticProps",
                                }
                            }
                        }
                    }
                }
            }
        }
    return {
        "type": "void",
        "name": "page",
        "x-component": "Page",
        "x-component-props": {"headerTitle": "数据看板"},
        "x-designer": "PageDesigner",
        "properties": {
            "grid": {
                "type": "void",
                "x-component": "Grid",
                "x-component-props": {"cols": 4, "rowHeight": 50, "showDivider": False},
                "x-initializer": "BlockInitializers",
                "x-designer": "GridDesigner",
                "properties": grid_props
            }
        }
    }


# 页面配置
page_configs = [
    {"name": "students-page", "title": "学生/客户管理", "collection": "students"},
    {"name": "follow-up-page", "title": "跟进记录", "collection": "follow_up_records"},
    {"name": "contracts-page", "title": "合同管理", "collection": "contracts"},
    {"name": "payments-page", "title": "收款记录", "collection": "payments"},
    {"name": "rebates-page", "title": "返佣记录", "collection": "rebates"},
    {"name": "expenses-page", "title": "费用支出", "collection": "expenses"},
    {"name": "applications-page", "title": "申请记录", "collection": "applications"},
    {"name": "offers-page", "title": "Offer管理", "collection": "offers"},
    {"name": "visas-page", "title": "签证管理", "collection": "visas"},
    {"name": "enrollment-page", "title": "入学报道", "collection": "enrollment"},
    {"name": "employees-page", "title": "员工管理", "collection": "employees"},
    {"name": "salaries-page", "title": "薪资管理", "collection": "salaries"},
    {"name": "commission-page", "title": "提成明细", "collection": "commission_details"},
    {"name": "partners-page", "title": "合作方管理", "collection": "partners"},
    {"name": "assets-page", "title": "资产管理", "collection": "assets"},
]

# 使用 :insert 插入每个页面
page_uids = {}
for pc in page_configs:
    schema = make_full_page_schema(pc["name"], pc["title"], pc["collection"])
    resp = api_post('/api/uiSchemas:insert', schema)
    if resp and 'data' in resp:
        uid = resp['data'].get('x-uid', '')
        page_uids[pc["name"]] = uid
        print("  OK %s -> %s" % (pc["title"], uid))
    else:
        page_uids[pc["name"]] = None
        print("  FAIL %s" % pc["title"])

# 仪表盘
dashboard_resp = api_post('/api/uiSchemas:insert', make_dashboard_schema())
if dashboard_resp and 'data' in dashboard_resp:
    page_uids["dashboard-page"] = dashboard_resp['data'].get('x-uid', '')
    print("  OK 数据看板 -> %s" % page_uids["dashboard-page"])
else:
    page_uids["dashboard-page"] = None
    print("  FAIL 数据看板")


# ============================================================
# Step 4: 创建 desktopRoutes
# ============================================================
print("\n" + "=" * 60)
print("Step 4: 创建桌面菜单路由")
print("=" * 60)

menu_groups = [
    {
        "title": "数据看板",
        "icon": "DashboardOutlined",
        "items": [{"title": "数据看板", "icon": "DashboardOutlined", "schema": page_uids.get("dashboard-page")}]
    },
    {
        "title": "学生管理",
        "icon": "UserOutlined",
        "items": [
            {"title": "学生/客户管理", "icon": "IdcardOutlined", "schema": page_uids.get("students-page")},
            {"title": "跟进记录", "icon": "ScheduleOutlined", "schema": page_uids.get("follow-up-page")},
        ]
    },
    {
        "title": "合同与财务",
        "icon": "DollarOutlined",
        "items": [
            {"title": "合同管理", "icon": "FileTextOutlined", "schema": page_uids.get("contracts-page")},
            {"title": "收款记录", "icon": "AccountBookOutlined", "schema": page_uids.get("payments-page")},
            {"title": "返佣记录", "icon": "SwapOutlined", "schema": page_uids.get("rebates-page")},
            {"title": "费用支出", "icon": "MoneyCollectOutlined", "schema": page_uids.get("expenses-page")},
        ]
    },
    {
        "title": "申请与进度",
        "icon": "SendOutlined",
        "items": [
            {"title": "申请记录", "icon": "FormOutlined", "schema": page_uids.get("applications-page")},
            {"title": "Offer管理", "icon": "TrophyOutlined", "schema": page_uids.get("offers-page")},
            {"title": "签证管理", "icon": "GlobalOutlined", "schema": page_uids.get("visas-page")},
            {"title": "入学报道", "icon": "BankOutlined", "schema": page_uids.get("enrollment-page")},
        ]
    },
    {
        "title": "人事管理",
        "icon": "TeamOutlined",
        "items": [
            {"title": "员工管理", "icon": "ContactsOutlined", "schema": page_uids.get("employees-page")},
            {"title": "薪资管理", "icon": "WalletOutlined", "schema": page_uids.get("salaries-page")},
            {"title": "提成明细", "icon": "PercentageOutlined", "schema": page_uids.get("commission-page")},
        ]
    },
    {
        "title": "合作与资产",
        "icon": "ApartmentOutlined",
        "items": [
            {"title": "合作方管理", "icon": "TeamOutlined", "schema": page_uids.get("partners-page")},
            {"title": "资产管理", "icon": "DatabaseOutlined", "schema": page_uids.get("assets-page")},
        ]
    },
]

for group in menu_groups:
    if len(group["items"]) == 1:
        item = group["items"][0]
        if not item["schema"]:
            continue
        resp = api_post('/api/desktopRoutes:create', {
            "title": item["title"], "icon": item["icon"], "schemaUid": item["schema"]
        })
        if resp and 'data' in resp:
            print("  OK [Menu] %s" % item["title"])
    else:
        resp = api_post('/api/desktopRoutes:create', {
            "title": group["title"], "icon": group["icon"]
        })
        if resp and 'data' in resp:
            group_id = resp['data']['id']
            print("  OK [Group] %s (id=%d)" % (group["title"], group_id))
            for item in group["items"]:
                if not item["schema"]:
                    continue
                sub_resp = api_post('/api/desktopRoutes:create', {
                    "title": item["title"], "icon": item["icon"],
                    "schemaUid": item["schema"], "parentId": group_id
                })
                if sub_resp and 'data' in sub_resp:
                    print("    OK [Sub] %s" % item["title"])


# ============================================================
# Step 5: 分配菜单权限给角色
# ============================================================
print("\n" + "=" * 60)
print("Step 5: 分配菜单权限")
print("=" * 60)

# 获取所有 desktopRoutes
routes = api_get('/api/desktopRoutes:list', {"pageSize": 50})
route_ids = [item['id'] for item in routes.get('data', [])]

# 获取 root 角色（以及 admin、member 等默认角色）
roles_resp = api_get('/api/roles:list', {"pageSize": 50})
for role in roles_resp.get('data', []):
    role_name = role.get('name', '')
    # 给所有角色分配所有菜单权限（避免业务用户登录后看到"暂无页面"）
    for route_id in route_ids:
        resp = api_post('/api/rolesDesktopRoutes:create', {
            'roleName': role_name,
            'desktopRouteId': route_id
        })
    print("  OK [%s] %d routes assigned" % (role_name, len(route_ids)))

# 验证
verify = api_get('/api/desktopRoutes:listAccessible')
if verify and 'data' in verify:
    groups = verify.get('data', [])
    total_sub = sum(len(g.get('children', [])) for g in groups)
    print("  Verify: %d groups, %d sub-menus accessible" % (len(groups), total_sub))

print("\n" + "=" * 60)
print("部署完成！")
print("=" * 60)
print("\n后台地址: http://111.229.72.128:8080/admin")
print("\n请刷新浏览器查看效果")
