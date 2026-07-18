/**
 * 完全重建 UI - 删除旧 schema + desktopRoutes，创建带预定义列的完整页面
 * 解决菜单空白问题
 */
import axios from 'axios';

const BASE = 'http://111.229.72.128:8080';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE';
const H = { headers: { Authorization: `Bearer ${TOKEN}` } };

const PAGE_COLLECTION_MAP = {
  'clients': '客户主表',
  'study_abroad_deals': '留学线索',
  'study_intentions': '留学意向',
  'rental_deals': '租房线索',
  'overseas_service_deals': '境外服务线索',
  'follow_up_records': '跟进记录',
  'document_progress': '文书进度',
  'applications': '申请记录',
  'offers': 'Offer管理',
  'contracts': '合同管理',
  'payments': '收款记录',
  'rebates': '返佣管理',
  'partners': '合作方管理',
  'websites': '站群管理',
  'assets': '新媒体资产',
  'employees': '员工管理',
  'salaries': '薪资管理',
  'commission_details': '提成明细',
  'media_performance': '新媒体业绩',
};

async function getFields(collectionName) {
  const r = await axios.get(`${BASE}/api/collections/${collectionName}/fields:list`, { ...H, params: { pageSize: 100 } });
  return (r.data?.data || []).filter(f => !['id', 'createdAt', 'updatedAt', 'createdById', 'updatedById'].includes(f.name));
}

function mapUIType(iface) {
  const map = {
    'input': 'string', 'textarea': 'string', 'richText': 'string',
    'phone': 'string', 'email': 'string', 'url': 'string',
    'number': 'number', 'integer': 'number', 'percent': 'number',
    'datetime': 'datetime', 'date': 'date', 'time': 'time',
    'select': 'string', 'radioGroup': 'string', 'checkboxGroup': 'array',
    'chinaRegion': 'string', 'm2o': 'belongsTo', 'o2m': 'hasMany',
    'm2m': 'belongsToMany', 'attachment': 'string', 'markdown': 'string',
    'boolean': 'boolean', 'subTable': 'string', 'icon': 'string',
  };
  return map[iface] || 'string';
}

/**
 * 构建包含预定义列的完整页面 Schema
 */
function makeFullPageSchema(pageTitle, collectionName, fields) {
  // 表格列
  const columns = {};
  const displayFields = fields.slice(0, 10);
  displayFields.forEach((f, idx) => {
    columns[`col_${f.name}`] = {
      type: 'void',
      title: f.uiSchema?.title || f.name,
      'x-component': 'TableV2.Column',
      'x-collection-field': `${collectionName}.${f.name}`,
      properties: {
        [f.name]: {
          type: mapUIType(f.interface || f.type),
          'x-component': 'CollectionField',
          'x-read-pretty': true,
          'x-component-props': { fieldName: f.name },
          'x-collection-field': `${collectionName}.${f.name}`,
        },
      },
    };
  });

  // 表单字段
  const formFields = {};
  const formDisplayFields = fields.slice(0, 12);
  formDisplayFields.forEach((f, idx) => {
    formFields[`field_${f.name}`] = {
      type: 'void',
      'x-component': 'Grid.Col',
      'x-component-props': { span: 12 },
      properties: {
        [f.name]: {
          type: mapUIType(f.interface || f.type),
          'x-component': 'CollectionField',
          'x-component-props': { fieldName: f.name },
          'x-collection-field': `${collectionName}.${f.name}`,
        },
      },
    };
  });

  return {
    type: 'void',
    name: 'page',
    'x-component': 'Page',
    'x-component-props': { headerTitle: pageTitle },
    'x-designer': 'PageDesigner',
    properties: {
      grid: {
        type: 'void',
        'x-component': 'Grid',
        'x-component-props': { cols: 1, rowHeight: 50, showDivider: false },
        'x-initializer': 'BlockInitializers',
        'x-designer': 'GridDesigner',
        properties: {
          row: {
            type: 'void',
            'x-component': 'Grid.Row',
            'x-designer': 'Grid.Row.Designer',
            properties: {
              col: {
                type: 'void',
                'x-component': 'Grid.Col',
                'x-component-props': { span: 24 },
                'x-designer': 'Grid.Col.Designer',
                properties: {
                  table: {
                    type: 'void',
                    'x-component': 'Table.V2',
                    'x-component-props': {
                      rowKey: 'id',
                      useProps: '{{ useTableBlockProps }}',
                      useSelectedRows: '{{ useSelectedRows }}',
                      bordered: true,
                      size: 'middle',
                    },
                    'x-designer': 'TableBlockDesigner',
                    'x-collection': collectionName,
                    'x-use-component-props': 'useTableBlockProps',
                    'x-initializer': 'TableColumnInitializers',
                    'x-settings': 'tableSettings',
                    properties: {
                      actions: {
                        type: 'void',
                        'x-component': 'ActionBar',
                        'x-component-props': { layout: 'one-column', style: { marginBottom: 16 } },
                        'x-initializer': 'TableActionInitializers',
                        'x-designer': 'ActionBarDesigner',
                        properties: {
                          add: {
                            type: 'void',
                            'x-action': 'create',
                            'x-component': 'Action',
                            'x-component-props': { type: 'primary', icon: 'PlusOutlined', useAction: '{{ useCreateAction }}' },
                            'x-designer': 'ActionDesigner',
                            'x-settings': 'actionSettings',
                            'x-align': 'left',
                            properties: {
                              drawer: {
                                type: 'void',
                                'x-component': 'Action.Drawer',
                                'x-component-props': { width: 700 },
                                properties: {
                                  form: {
                                    type: 'void',
                                    'x-component': 'FormV2',
                                    'x-use-component-props': 'useCreateFormBlockProps',
                                    properties: {
                                      grid: {
                                        type: 'void',
                                        'x-component': 'Grid',
                                        'x-component-props': { cols: 2, showDivider: false },
                                        'x-initializer': 'FormItemInitializers',
                                        properties: formFields,
                                      },
                                      footer: {
                                        type: 'void',
                                        'x-component': 'Action.Drawer.FootBar',
                                        properties: {
                                          submit: {
                                            type: 'void',
                                            title: '{{ t("Submit") }}',
                                            'x-component': 'Action',
                                            'x-component-props': { type: 'primary', htmlType: 'submit', useAction: '{{ useSubmitAction }}' },
                                          },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                          delete: {
                            type: 'void',
                            'x-action': 'destroy',
                            'x-component': 'Action',
                            'x-component-props': { useAction: '{{ useBulkDestroyAction }}' },
                            'x-designer': 'ActionDesigner',
                            'x-settings': 'actionSettings',
                            'x-align': 'left',
                          },
                        },
                      },
                      ...columns,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function makeDashboardSchema() {
  return {
    type: 'void',
    name: 'page',
    'x-component': 'Page',
    'x-component-props': { headerTitle: '数据看板' },
    'x-designer': 'PageDesigner',
    properties: {
      grid: {
        type: 'void',
        'x-component': 'Grid',
        'x-component-props': { cols: 4, rowHeight: 50, showDivider: false },
        'x-initializer': 'BlockInitializers',
        'x-designer': 'GridDesigner',
        properties: {
          row1: {
            type: 'void', 'x-component': 'Grid.Row', 'x-designer': 'Grid.Row.Designer',
            properties: {
              col1: {
                type: 'void', 'x-component': 'Grid.Col', 'x-component-props': { span: 6 }, 'x-designer': 'Grid.Col.Designer',
                properties: {
                  card: {
                    type: 'void', 'x-component': 'CardItem', 'x-designer': 'CardItemDesigner',
                    properties: {
                      stat: {
                        type: 'void', 'x-component': 'Statistic', 'x-component-props': { title: '留学线索数' },
                        'x-collection': 'study_abroad_deals', 'x-use-component-props': 'useStatisticProps',
                      },
                    },
                  },
                },
              },
              col2: {
                type: 'void', 'x-component': 'Grid.Col', 'x-component-props': { span: 6 }, 'x-designer': 'Grid.Col.Designer',
                properties: {
                  card: {
                    type: 'void', 'x-component': 'CardItem', 'x-designer': 'CardItemDesigner',
                    properties: {
                      stat: {
                        type: 'void', 'x-component': 'Statistic', 'x-component-props': { title: '租房线索数' },
                        'x-collection': 'rental_deals', 'x-use-component-props': 'useStatisticProps',
                      },
                    },
                  },
                },
              },
              col3: {
                type: 'void', 'x-component': 'Grid.Col', 'x-component-props': { span: 6 }, 'x-designer': 'Grid.Col.Designer',
                properties: {
                  card: {
                    type: 'void', 'x-component': 'CardItem', 'x-designer': 'CardItemDesigner',
                    properties: {
                      stat: {
                        type: 'void', 'x-component': 'Statistic', 'x-component-props': { title: '境外服务线索数' },
                        'x-collection': 'overseas_service_deals', 'x-use-component-props': 'useStatisticProps',
                      },
                    },
                  },
                },
              },
              col4: {
                type: 'void', 'x-component': 'Grid.Col', 'x-component-props': { span: 6 }, 'x-designer': 'Grid.Col.Designer',
                properties: {
                  card: {
                    type: 'void', 'x-component': 'CardItem', 'x-designer': 'CardItemDesigner',
                    properties: {
                      stat: {
                        type: 'void', 'x-component': 'Statistic', 'x-component-props': { title: '客户总数' },
                        'x-collection': 'clients', 'x-use-component-props': 'useStatisticProps',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

async function main() {
  console.log('=== 完全重建 NocoBase UI ===\n');

  // Step 1: 删除所有现有 desktopRoutes
  console.log('Step 1: 删除旧 desktopRoutes');
  const routesRes = await axios.get(`${BASE}/api/desktopRoutes:list`, { ...H, params: { pageSize: 500 } });
  const routes = routesRes.data?.data || [];
  for (const r of routes) {
    await axios.delete(`${BASE}/api/desktopRoutes/${r.id}`, H).catch(() => {});
  }
  console.log(`  已删除 ${routes.length} 条路由`);

  // Step 2: 获取旧页面 schema uid
  console.log('\nStep 2: 获取旧 schema UIDs');
  const schemasRes = await axios.get(`${BASE}/api/uiSchemas:list`, { ...H, params: { pageSize: 2000 } });
  const oldSchemas = schemasRes.data?.data || [];
  const oldSchemaUids = oldSchemas.map(s => s['x-uid']).filter(Boolean);
  console.log(`  找到 ${oldSchemaUids.length} 个旧 schema`);

  // Step 3: 创建新页面 schema（带列）
  console.log('\nStep 3: 创建新页面 Schema');
  const pageUids = {};

  for (const [collectionName, pageTitle] of Object.entries(PAGE_COLLECTION_MAP)) {
    try {
      const fields = await getFields(collectionName);
      const schema = makeFullPageSchema(pageTitle, collectionName, fields);
      const res = await axios.post(`${BASE}/api/uiSchemas:insert`, schema, H);
      if (res.data?.data) {
        const uid = res.data.data['x-uid'];
        pageUids[collectionName] = uid;
        console.log(`  ✓ ${pageTitle} -> ${uid} (${fields.length} 字段, ${Math.min(fields.length, 10)} 列)`);
      }
    } catch (e) {
      console.log(`  ✗ ${pageTitle}: ${e.response?.status} ${e.response?.data?.errors?.[0]?.message || e.message}`);
    }
  }

  // 数据看板
  try {
    const dashSchema = makeDashboardSchema();
    const dashRes = await axios.post(`${BASE}/api/uiSchemas:insert`, dashSchema, H);
    if (dashRes.data?.data) {
      pageUids['__dashboard__'] = dashRes.data.data['x-uid'];
      console.log(`  ✓ 数据看板 -> ${pageUids['__dashboard__']}`);
    }
  } catch (e) {
    console.log(`  ✗ 数据看板: ${e.message}`);
  }

  // Step 4: 创建菜单
  console.log('\nStep 4: 创建菜单路由');
  const menuGroups = [
    {
      title: '数据看板', icon: 'DashboardOutlined',
      items: [{ title: '数据看板', icon: 'DashboardOutlined', schema: pageUids['__dashboard__'] }],
    },
    {
      title: '学生管理', icon: 'UserOutlined',
      items: [
        { title: '客户主表', icon: 'IdcardOutlined', schema: pageUids['clients'] },
        { title: '留学线索', icon: 'SendOutlined', schema: pageUids['study_abroad_deals'] },
        { title: '留学意向', icon: 'AimOutlined', schema: pageUids['study_intentions'] },
        { title: '租房线索', icon: 'HomeOutlined', schema: pageUids['rental_deals'] },
        { title: '境外服务线索', icon: 'GlobalOutlined', schema: pageUids['overseas_service_deals'] },
        { title: '跟进记录', icon: 'ScheduleOutlined', schema: pageUids['follow_up_records'] },
      ],
    },
    {
      title: '文书与申请', icon: 'FileTextOutlined',
      items: [
        { title: '文书进度', icon: 'SolutionOutlined', schema: pageUids['document_progress'] },
        { title: '申请记录', icon: 'FormOutlined', schema: pageUids['applications'] },
        { title: 'Offer管理', icon: 'TrophyOutlined', schema: pageUids['offers'] },
      ],
    },
    {
      title: '合同与财务', icon: 'DollarOutlined',
      items: [
        { title: '合同管理', icon: 'FileProtectOutlined', schema: pageUids['contracts'] },
        { title: '收款记录', icon: 'AccountBookOutlined', schema: pageUids['payments'] },
        { title: '返佣管理', icon: 'SwapOutlined', schema: pageUids['rebates'] },
      ],
    },
    {
      title: '合作与资产', icon: 'ApartmentOutlined',
      items: [
        { title: '合作方管理', icon: 'TeamOutlined', schema: pageUids['partners'] },
        { title: '站群管理', icon: 'CloudServerOutlined', schema: pageUids['websites'] },
        { title: '新媒体资产', icon: 'PlaySquareOutlined', schema: pageUids['assets'] },
      ],
    },
    {
      title: '人事管理', icon: 'TeamOutlined',
      items: [
        { title: '员工管理', icon: 'ContactsOutlined', schema: pageUids['employees'] },
        { title: '薪资管理', icon: 'WalletOutlined', schema: pageUids['salaries'] },
        { title: '提成明细', icon: 'PercentageOutlined', schema: pageUids['commission_details'] },
        { title: '新媒体业绩', icon: 'BarChartOutlined', schema: pageUids['media_performance'] },
      ],
    },
  ];

  for (const group of menuGroups) {
    if (group.items.length === 1) {
      const item = group.items[0];
      if (!item.schema) continue;
      try {
        await axios.post(`${BASE}/api/desktopRoutes:create`, {
          title: item.title, icon: item.icon, schemaUid: item.schema,
        }, H);
        console.log(`  ✓ ${item.title}`);
      } catch (e) { console.log(`  ✗ ${item.title}: ${e.message}`); }
    } else {
      try {
        const grpRes = await axios.post(`${BASE}/api/desktopRoutes:create`, {
          title: group.title, icon: group.icon,
        }, H);
        if (grpRes.data?.data) {
          const gid = grpRes.data.data.id;
          console.log(`  ✓ [分组] ${group.title}`);
          for (const item of group.items) {
            if (!item.schema) continue;
            try {
              await axios.post(`${BASE}/api/desktopRoutes:create`, {
                title: item.title, icon: item.icon,
                schemaUid: item.schema, parentId: gid,
              }, H);
              console.log(`    ✓ ${item.title}`);
            } catch (e) { console.log(`    ✗ ${item.title}: ${e.message}`); }
          }
        }
      } catch (e) { console.log(`  ✗ ${group.title}: ${e.message}`); }
    }
  }

  // Step 5: 分配权限
  console.log('\nStep 5: 分配菜单权限');
  const newRoutesRes = await axios.get(`${BASE}/api/desktopRoutes:list`, { ...H, params: { pageSize: 200 } });
  const newRouteIds = (newRoutesRes.data?.data || []).map(r => r.id);

  const rolesRes = await axios.get(`${BASE}/api/roles:list`, { ...H, params: { pageSize: 50 } });
  const roles = rolesRes.data?.data || [];

  for (const role of roles) {
    for (const rid of newRouteIds) {
      try {
        await axios.post(`${BASE}/api/rolesDesktopRoutes:create`, {
          roleName: role.name, desktopRouteId: rid,
        }, H);
      } catch (e) { /* ignore duplicates */ }
    }
    console.log(`  ✓ ${role.name}`);
  }

  // Step 6: 删除旧 schema
  console.log('\nStep 6: 删除旧 schema');
  let deleted = 0;
  for (const uid of oldSchemaUids) {
    try {
      await axios.delete(`${BASE}/api/uiSchemas/${uid}`, H);
      deleted++;
    } catch (e) { /* skip */ }
  }
  console.log(`  已删除 ${deleted}/${oldSchemaUids.length} 个旧 schema`);

  console.log('\n=== 全部完成 ===');
  console.log(`后台地址: ${BASE}/admin`);
}

main().catch(console.error);
