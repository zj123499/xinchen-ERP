/**
 * 修复 NocoBase 菜单空白 - 方案B：通过 PATCH 更新 schema properties
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

function findNodeByComponent(schema, component, results = []) {
  if (!schema || typeof schema !== 'object') return results;
  if (schema['x-component'] === component) results.push(schema);
  if (schema.properties) {
    for (const v of Object.values(schema.properties)) findNodeByComponent(v, component, results);
  }
  return results;
}

async function getPageSchema(pageUid) {
  const r = await axios.get(`${BASE}/api/uiSchemas:getJsonSchema/${pageUid}`, H);
  return r.data?.data || {};
}

async function patchSchemaNode(uid, properties) {
  try {
    // 使用 patch 更新 schema 节点的 properties
    const r = await axios.patch(`${BASE}/api/uiSchemas/${uid}`, {
      properties: properties,
    }, H);
    return r.data;
  } catch (e) {
    console.error(`    PATCH failed: ${e.response?.status} ${e.response?.data?.errors?.[0]?.message || e.message}`);
    return null;
  }
}

async function main() {
  console.log('=== 修复菜单空白：PATCH Table.V2 添加列定义 ===\n');

  for (const [pageUid, collectionName] of Object.entries(PAGE_COLLECTION_MAP)) {
    console.log(`\n[${collectionName}] ${pageUid}`);
    const fields = await getFields(collectionName);
    console.log(`  字段数: ${fields.length}`);

    const schema = await getPageSchema(pageUid);
    
    // 找 Table.V2 节点
    const tables = findNodeByComponent(schema, 'Table.V2');
    if (tables.length > 0 && tables[0]['x-uid']) {
      const tableUid = tables[0]['x-uid'];
      const existingProps = tables[0].properties || {};
      const existingKeys = Object.keys(existingProps).filter(k => k !== 'actions');
      
      if (existingKeys.length === 0) {
        // 构建列 properties
        const newCols = {};
        const displayFields = fields.slice(0, 10);
        displayFields.forEach((f, idx) => {
          newCols[`col_${f.name}`] = {
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

        // 合并现有 actions + 新列
        const merged = { ...existingProps, ...newCols };
        await patchSchemaNode(tableUid, merged);
        console.log(`  ✓ 表格已添加 ${displayFields.length} 列`);
      } else {
        console.log(`  表格已有 ${existingKeys.length} 列，跳过`);
      }
    }

    // 找 FormV2 的 Grid
    const formGrids = findNodeByComponent(schema, 'Grid').filter(g => g['x-initializer'] === 'FormItemInitializers');
    if (formGrids.length > 0 && formGrids[0]['x-uid']) {
      const gridUid = formGrids[0]['x-uid'];
      const existingFields = Object.keys(formGrids[0].properties || {});
      
      if (existingFields.length === 0) {
        const newFields = {};
        const displayFields = fields.slice(0, 12);
        displayFields.forEach((f, idx) => {
          newFields[`field_${f.name}`] = {
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
        
        const merged = { ...(formGrids[0].properties || {}), ...newFields };
        await patchSchemaNode(gridUid, merged);
        console.log(`  ✓ 表单已添加 ${displayFields.length} 字段`);
      } else {
        console.log(`  表单已有 ${existingFields.length} 字段，跳过`);
      }
    }
  }

  console.log('\n=== 完成 ===');
}

main().catch(console.error);
