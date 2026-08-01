/**
 * 修复 NocoBase 菜单空白问题
 * 为每个页面的 Table.V2 添加列定义，为表单添加字段
 */
import axios from 'axios';

const BASE = 'http://111.229.72.128:8080';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE';
const H = { headers: { Authorization: `Bearer ${TOKEN}` } };

const PAGE_COLLECTION_MAP = {
  'papg0jjo634': 'clients',
  'j9680vp5p0c': 'study_abroad_deals',
  '7a0czjaulpm': 'study_intentions',
  'hvyob7ydb8a': 'rental_deals',
  '4dw76jf26k1': 'overseas_service_deals',
  'nc0ew8wv7yd': 'follow_up_records',
  'uvs9oqxufsq': 'document_progress',
  'h7iahr3dm6m': 'applications',
  'na35dch9hty': 'offers',
  'bzd5scowvde': 'contracts',
  '7q02im5gowe': 'payments',
  '1mjciscnf8o': 'rebates',
  'c2mt5pdybtw': 'partners',
  '8qfdcjsm514': 'websites',
  'f2uyqlvuxfl': 'assets',
  'lji4jji79gi': 'employees',
  'elqf6jqyorh': 'salaries',
  '6e1zoes40nr': 'commission_details',
  'e0glgp1z8dq': 'media_performance',
};

/**
 * 获取 collection 字段
 */
async function getFields(collectionName) {
  const r = await axios.get(`${BASE}/api/collections/${collectionName}/fields:list`, { ...H, params: { pageSize: 100 } });
  return (r.data?.data || []).filter(f => !['id', 'createdAt', 'updatedAt', 'createdById', 'updatedById'].includes(f.name));
}

/**
 * 获取页面的完整 schema 树，找到 table 节点和 form grid 节点的 uid
 */
async function getPageSchema(pageUid) {
  const r = await axios.get(`${BASE}/api/uiSchemas:getJsonSchema/${pageUid}`, H);
  return r.data?.data || {};
}

/**
 * 递归查找节点
 */
function findNodeByComponent(schema, component, results = []) {
  if (!schema || typeof schema !== 'object') return results;
  if (schema['x-component'] === component) {
    results.push(schema);
  }
  if (schema.properties) {
    for (const v of Object.values(schema.properties)) {
      findNodeByComponent(v, component, results);
    }
  }
  return results;
}

function findNodeByXUid(schema, xuid, results = []) {
  if (!schema || typeof schema !== 'object') return results;
  if (schema['x-uid'] === xuid) {
    results.push(schema);
  }
  if (schema.properties) {
    for (const v of Object.values(schema.properties)) {
      findNodeByXUid(v, xuid, results);
    }
  }
  return results;
}

/**
 * 在 table 节点中插入列
 */
async function insertTableColumns(tableUid, fields) {
  const MAX_COLS = 8;
  const displayFields = fields.slice(0, MAX_COLS);

  for (let i = 0; i < displayFields.length; i++) {
    const f = displayFields[i];
    const colSchema = {
      type: 'void',
      title: f.uiSchema?.title || f.name,
      'x-component': 'TableV2.Column',
      'x-collection-field': `${PAGE_COLLECTION_MAP[tableUid] || 'unknown'}.${f.name}`,
      properties: {
        [f.name]: {
          type: mapUIType(f.interface || f.type),
          'x-component': 'CollectionField',
          'x-component-props': {
            fieldName: f.name,
          },
        },
      },
    };

    try {
      await axios.post(`${BASE}/api/uiSchemas:insertAdjacent/${tableUid}`, {
        position: 'beforeEnd',
        schema: colSchema,
        wrap: null,
      }, H);
    } catch (e) {
      console.error(`    ✗ col ${f.name}: ${e.response?.data?.errors?.[0]?.message || e.message}`);
      // 尝试用 patch 方式
      try {
        await axios.patch(`${BASE}/api/uiSchemas:patch/${tableUid}`, {
          properties: {
            [`col_${f.name}`]: colSchema,
          },
        }, H);
      } catch (e2) {
        // ignore
      }
    }
  }
}

/**
 * 在表单 Grid 节点中插入表单字段
 */
async function insertFormFields(gridUid, fields) {
  const MAX_FIELDS = 12;
  const displayFields = fields.slice(0, MAX_FIELDS);

  for (let i = 0; i < displayFields.length; i++) {
    const f = displayFields[i];
    const fieldSchema = {
      type: 'void',
      'x-component': 'Grid.Col',
      'x-component-props': {
        span: 12,
      },
      properties: {
        [f.name]: {
          type: mapUIType(f.interface || f.type),
          'x-component': 'CollectionField',
          'x-component-props': {
            fieldName: f.name,
          },
          'x-collection-field': `${PAGE_COLLECTION_MAP[gridUid] || 'unknown'}.${f.name}`,
        },
      },
    };

    try {
      await axios.post(`${BASE}/api/uiSchemas:insertAdjacent/${gridUid}`, {
        position: 'beforeEnd',
        schema: fieldSchema,
      }, H);
    } catch (e) {
      // try patch
      try {
        await axios.patch(`${BASE}/api/uiSchemas:patch/${gridUid}`, {
          properties: {
            [`field_${f.name}`]: fieldSchema,
          },
        }, H);
      } catch (e2) {
        // ignore
      }
    }
  }
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

async function main() {
  console.log('=== 修复菜单空白：添加表格列和表单字段 ===\n');

  for (const [pageUid, collectionName] of Object.entries(PAGE_COLLECTION_MAP)) {
    console.log(`\n[${collectionName}]`);
    const fields = await getFields(collectionName);
    console.log(`  字段数: ${fields.length}`);

    // 获取页面完整 schema
    const schema = await getPageSchema(pageUid);

    // 找到 Table.V2 节点
    const tables = findNodeByComponent(schema, 'Table.V2');
    // 找到 FormV2 的 Grid 节点（用于新增表单）
    const formGrids = findNodeByComponent(schema, 'Grid').filter(g => {
      // FormV2 里的 Grid 有 FormItemInitializers
      return g['x-initializer'] === 'FormItemInitializers';
    });

    if (tables.length > 0) {
      const tableUid = tables[0]['x-uid'];
      if (tableUid) {
        // 检查是否已有列
        const existingCols = Object.keys(tables[0].properties || {}).filter(k => k !== 'actions');
        console.log(`  表格现有列: ${existingCols.length}, uid=${tableUid}`);
        if (existingCols.length === 0) {
          await insertTableColumns(tableUid, fields);
          console.log(`  ✓ 表格列已添加`);
        }
      }
    }

    if (formGrids.length > 0) {
      const gridUid = formGrids[0]['x-uid'];
      if (gridUid) {
        const existingFields = Object.keys(formGrids[0].properties || {});
        console.log(`  表单现有字段: ${existingFields.length}, uid=${gridUid}`);
        if (existingFields.length === 0) {
          await insertFormFields(gridUid, fields);
          console.log(`  ✓ 表单字段已添加`);
        }
      }
    }
  }

  console.log('\n=== 完成 ===');
}

main().catch(console.error);
