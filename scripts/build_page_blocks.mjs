/**
 * 为每个菜单页面构建 TableBlock + 表单 Schema
 * 解决"菜单空白"问题：页面只是空壳 Page 组件，内部没有表格区块
 */
import axios from 'axios';

const BASE = 'http://111.229.72.128:8080';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE';
const H = { headers: { Authorization: `Bearer ${TOKEN}` } };

// 菜单页面映射: schemaUid → collectionName
const PAGE_COLLECTION_MAP = {
  // 学生管理
  'papg0jjo634': 'clients',           // 客户主表
  'j9680vp5p0c': 'study_abroad_deals', // 留学线索
  '7a0czjaulpm': 'study_intentions',   // 留学意向
  'hvyob7ydb8a': 'rental_deals',       // 租房线索
  '4dw76jf26k1': 'overseas_service_deals', // 境外服务线索
  'nc0ew8wv7yd': 'follow_up_records',  // 跟进记录
  // 文书与申请
  'uvs9oqxufsq': 'document_progress',  // 文书进度
  'h7iahr3dm6m': 'applications',       // 申请记录
  'na35dch9hty': 'offers',             // Offer管理
  // 合同与财务
  'bzd5scowvde': 'contracts',          // 合同管理
  '7q02im5gowe': 'payments',           // 收款记录
  '1mjciscnf8o': 'rebates',            // 返佣管理
  // 合作与资产
  'c2mt5pdybtw': 'partners',           // 合作方管理
  '8qfdcjsm514': 'websites',           // 站群管理
  'f2uyqlvuxfl': 'assets',             // 新媒体资产
  // 人事管理
  'lji4jji79gi': 'employees',          // 员工管理
  'elqf6jqyorh': 'salaries',           // 薪资管理
  '6e1zoes40nr': 'commission_details', // 提成明细
  'e0glgp1z8dq': 'media_performance',  // 新媒体业绩
};

// 数据看板页面（特殊处理，放统计图表）
const DASHBOARD_UID = '82q775bo0lo';

/**
 * 获取 collection 的所有字段
 */
async function getCollectionFields(collectionName) {
  const r = await axios.get(`${BASE}/api/collections/${collectionName}/fields:list`, { ...H, params: { pageSize: 100 } });
  const fields = r.data?.data || [];
  return fields.filter(f => !['id', 'createdAt', 'updatedAt', 'createdById', 'updatedById'].includes(f.name));
}

/**
 * 构建表格 Schema
 */
function buildTableBlockSchema(collectionName, fields) {
  // 为每个字段构建列
  const columns = {};
  fields.forEach((f, idx) => {
    const colKey = `col_${f.name}`;
    const uiType = mapUIType(f.interface || f.type);
    columns[colKey] = {
      type: 'void',
      title: f.uiSchema?.title || f.name,
      'x-component': 'TableV2.Column',
      properties: {
        [f.name]: {
          type: uiType,
          'x-component': 'CollectionField',
          'x-component-props': {
            fieldName: f.name,
          },
        },
      },
    };
  });

  // 添加操作列
  columns['actions_col'] = {
    type: 'void',
    title: '操作',
    'x-component': 'TableV2.Column',
    properties: {
      actions: {
        type: 'void',
        'x-component': 'Space',
        properties: {
          view: {
            type: 'void',
            'x-component': 'Action.Link',
            'x-component-props': {
              action: 'view',
              type: 'primary',
            },
            'x-use-component-props': 'useViewActionProps',
          },
          edit: {
            type: 'void',
            'x-component': 'Action.Link',
            'x-component-props': {
              action: 'update',
            },
            'x-use-component-props': 'useEditActionProps',
          },
          delete: {
            type: 'void',
            'x-component': 'Action.Link',
            'x-component-props': {
              action: 'destroy',
              danger: true,
            },
            'x-use-component-props': 'useDestroyActionProps',
          },
        },
      },
    },
  };

  return {
    type: 'void',
    'x-component': 'CardItem',
    properties: {
      tableBlock: {
        type: 'void',
        'x-component': 'TableBlockProvider',
        'x-component-props': {
          collection: collectionName,
          action: 'list',
          params: {
            pageSize: 20,
            sort: ['-createdAt'],
          },
        },
        properties: {
          actions: {
            type: 'void',
            'x-component': 'ActionBar',
            'x-component-props': {
              style: { marginBottom: 16 },
            },
            properties: {
              add: {
                type: 'void',
                title: '新增',
                'x-component': 'Action',
                'x-component-props': {
                  action: 'create',
                  type: 'primary',
                },
                'x-use-component-props': 'useCreateActionProps',
              },
            },
          },
          table: {
            type: 'void',
            'x-component': 'TableV2',
            'x-use-component-props': 'useTableBlockProps',
            properties: columns,
          },
        },
      },
    },
  };
}

function mapUIType(interfaceName) {
  const map = {
    'input': 'string',
    'textarea': 'string',
    'richText': 'string',
    'phone': 'string',
    'email': 'string',
    'url': 'string',
    'number': 'number',
    'integer': 'number',
    'percent': 'number',
    'datetime': 'datetime',
    'date': 'date',
    'time': 'time',
    'select': 'string',
    'radioGroup': 'string',
    'checkboxGroup': 'array',
    'chinaRegion': 'string',
    'm2o': 'belongsTo',
    'o2m': 'hasMany',
    'm2m': 'belongsToMany',
    'attachment': 'string',
    'markdown': 'string',
    'boolean': 'boolean',
    'subTable': 'string',
  };
  return map[interfaceName] || 'string';
}

/**
 * 使用 insertAdjacent 将 table block 插入到页面
 */
async function insertBlockIntoPage(schemaUid, blockSchema) {
  try {
    const r = await axios.post(`${BASE}/api/uiSchemas:insertAdjacent/${schemaUid}`, {
      position: 'beforeEnd',
      schema: blockSchema,
    }, H);
    console.log(`  ✓ schema inserted into ${schemaUid}`);
    return r.data;
  } catch (e) {
    console.error(`  ✗ failed to insert into ${schemaUid}: ${e.response?.data?.errors?.[0]?.message || e.message}`);
    return null;
  }
}

/**
 * 构建数据看板页面 Schema
 */
function buildDashboardSchema() {
  return {
    type: 'void',
    'x-component': 'Grid',
    'x-component-props': {
      cols: 2,
    },
    properties: {
      card1: {
        type: 'void',
        'x-component': 'Grid.Col',
        properties: {
          stat1: {
            type: 'void',
            'x-component': 'CardItem',
            properties: {
              content: {
                type: 'void',
                'x-component': 'h2',
                'x-content': '数据看板建设中...',
              },
            },
          },
        },
      },
    },
  };
}

async function main() {
  console.log('=== 开始为页面构建 TableBlock Schema ===\n');

  for (const [schemaUid, collectionName] of Object.entries(PAGE_COLLECTION_MAP)) {
    console.log(`\n[${collectionName}] → schema: ${schemaUid}`);
    try {
      const fields = await getCollectionFields(collectionName);
      console.log(`  字段数: ${fields.length}`);

      const blockSchema = buildTableBlockSchema(collectionName, fields);
      await insertBlockIntoPage(schemaUid, blockSchema);
    } catch (e) {
      console.error(`  ✗ error: ${e.message}`);
    }
  }

  // 处理数据看板
  console.log(`\n[数据看板] → schema: ${DASHBOARD_UID}`);
  const dashboardSchema = buildDashboardSchema();
  await insertBlockIntoPage(DASHBOARD_UID, dashboardSchema);

  console.log('\n=== 全部完成 ===');
}

main().catch(console.error);
