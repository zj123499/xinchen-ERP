#!/usr/bin/env node
/**
 * 新辰未来管理系统 - NocoBase 完整重构脚本
 * 
 * 执行顺序：
 * 1. 废弃旧表（删除不再需要的 collection）
 * 2. 改造保留表（添加/删除/修改字段）
 * 3. 创建新表（全新的 collection）
 * 4. 配置关联关系
 * 5. 部署 UI 页面和菜单
 * 6. 配置角色权限
 */

const BASE = 'http://111.229.72.128:8080';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc4Mzc4MDQ3MCwiZXhwIjozMzM0MTM4MDQ3MH0.mGvWH2YWCU-4LyUC5e2y0JWJ8MtqmHmS2ldx8LBmtgE';
const H = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json'
};

async function apiGet(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
  if (!res.ok) return { data: [], meta: {} };
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(BASE + path, { method: 'POST', headers: H, body: JSON.stringify(data) });
  if (!res.ok) {
    const text = await res.text();
    console.log(`  POST ${path} ERROR ${res.status}: ${text.substring(0, 200)}`);
    return null;
  }
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(BASE + path, { method: 'DELETE', headers: { 'Authorization': `Bearer ${TOKEN}` } });
  return res.ok;
}

async function apiPatch(path, data) {
  const res = await fetch(BASE + path, { method: 'PATCH', headers: H, body: JSON.stringify(data) });
  if (!res.ok) {
    const text = await res.text();
    console.log(`  PATCH ${path} ERROR ${res.status}: ${text.substring(0, 200)}`);
    return null;
  }
  return res.json();
}

// ============================================================
// Step 1: 废弃旧表
// ============================================================
async function step1_dropOldTables() {
  console.log('='.repeat(60));
  console.log('Step 1: 废弃旧表');
  console.log('='.repeat(60));

  const toDrop = [
    'students',      // → 改为 clients + study_abroad_deals
    'applications',  // → 改为新的 applications（挂在 document_progress 下）
    'visas',         // → 合并到 document_progress
    'enrollment',    // → 合并到 document_progress
    'expenses',      // → 支出走钉钉，删除
  ];

  for (const name of toDrop) {
    // 先检查是否存在
    const check = await apiGet(`/api/collections/${name}`);
    if (check && check.data && check.data.name) {
      const res = await fetch(BASE + `/api/collections/${name}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${TOKEN}` } });
      if (res.ok) {
        console.log(`  DELETED ${name}`);
      } else {
        console.log(`  FAILED to delete ${name}: ${res.status}`);
      }
    } else {
      console.log(`  SKIP ${name} (not found)`);
    }
  }
}

// ============================================================
// Step 2: 改造保留表
// ============================================================
async function step2_updateExistingTables() {
  console.log('\n' + '='.repeat(60));
  console.log('Step 2: 改造保留表');
  console.log('='.repeat(60));

  // ---- contracts: 添加新字段 ----
  console.log('\n--- contracts ---');
  const contractFields = [
    { name: 'deposit', type: 'double', interface: 'number', uiSchema: { title: '押金金额', 'x-component': 'InputNumber', 'x-component-props': { min: 0 } } },
    { name: 'deposit_returned', type: 'boolean', interface: 'checkbox', uiSchema: { title: '押金已退还' } },
    { name: 'deposit_return_date', type: 'date', interface: 'datetime', uiSchema: { title: '退还日期' } },
  ];
  for (const f of contractFields) {
    await apiPost('/api/collections/contracts/fields:create', f);
    console.log(`  + field: ${f.name}`);
  }

  // ---- rebates: 添加新字段 ----
  console.log('\n--- rebates ---');
  const rebateFields = [
    { name: 'deal_type', type: 'string', interface: 'select', uiSchema: { title: '业务类型', 'x-component': 'Select', enum: [
      { value: 'study_abroad', label: '留学' },
      { value: 'rental', label: '租房' },
      { value: 'overseas_service', label: '境外服务' },
    ]}},
    { name: 'deal_id', type: 'bigInt', interface: 'integer', uiSchema: { title: '业务记录ID' } },
    { name: 'direction', type: 'string', interface: 'select', uiSchema: { title: '返佣方向', 'x-component': 'Select', enum: [
      { value: 'income', label: '收入' },
      { value: 'expense', label: '支出' },
    ]}},
    { name: 'base_amount', type: 'double', interface: 'number', uiSchema: { title: '计算基数' } },
    { name: 'rate', type: 'double', interface: 'number', uiSchema: { title: '返佣比例(%)' } },
    { name: 'expected_date', type: 'date', interface: 'datetime', uiSchema: { title: '预计返佣日期' } },
    { name: 'initiator', type: 'belongsTo', target: 'employees', foreignKey: 'initiator_id', interface: 'm2o', uiSchema: { title: '发起人', 'x-component': 'AssociationField' } },
  ];
  for (const f of rebateFields) {
    await apiPost('/api/collections/rebates/fields:create', f);
    console.log(`  + field: ${f.name}`);
  }

  // ---- partners: 添加新字段 ----
  console.log('\n--- partners ---');
  const partnerFields = [
    { name: 'charge_mode', type: 'string', interface: 'select', uiSchema: { title: '收费模式', 'x-component': 'Select', enum: [
      { value: 'free', label: '免费' },
      { value: 'paid', label: '收费' },
    ]}},
    { name: 'fee_description', type: 'text', interface: 'textarea', uiSchema: { title: '费用说明' } },
  ];
  for (const f of partnerFields) {
    await apiPost('/api/collections/partners/fields:create', f);
    console.log(`  + field: ${f.name}`);
  }

  // ---- assets: 改造为新媒体资产 ----
  console.log('\n--- assets ---');
  // 添加新字段
  const assetNewFields = [
    { name: 'enterprise_name', type: 'string', interface: 'input', uiSchema: { title: '企业名（认证主体）' } },
  ];
  for (const f of assetNewFields) {
    await apiPost('/api/collections/assets/fields:create', f);
    console.log(`  + field: ${f.name}`);
  }

  // ---- follow_up_records: 添加新字段 ----
  console.log('\n--- follow_up_records ---');
  const followupFields = [
    { name: 'deal_type', type: 'string', interface: 'select', uiSchema: { title: '业务类型', 'x-component': 'Select', enum: [
      { value: 'study_abroad', label: '留学' },
      { value: 'rental', label: '租房' },
      { value: 'overseas_service', label: '境外服务' },
    ]}},
    { name: 'deal_id', type: 'bigInt', interface: 'integer', uiSchema: { title: '业务记录ID' } },
    { name: 'next_follow_date', type: 'date', interface: 'datetime', uiSchema: { title: '下次跟进日期' } },
    { name: 'content', type: 'text', interface: 'textarea', uiSchema: { title: '跟进内容' } },
  ];
  for (const f of followupFields) {
    await apiPost('/api/collections/follow_up_records/fields:create', f);
    console.log(`  + field: ${f.name}`);
  }

  // ---- employees: 添加新字段 ----
  console.log('\n--- employees ---');
  const employeeFields = [
    { name: 'performance_base', type: 'double', interface: 'number', uiSchema: { title: '绩效基数' } },
  ];
  for (const f of employeeFields) {
    await apiPost('/api/collections/employees/fields:create', f);
    console.log(`  + field: ${f.name}`);
  }

  // ---- salaries: 添加新字段 ----
  console.log('\n--- salaries ---');
  const salaryFields = [
    { name: 'performance_pay', type: 'double', interface: 'number', uiSchema: { title: '绩效工资' } },
    { name: 'media_view_bonus', type: 'double', interface: 'number', uiSchema: { title: '新媒体浏览量奖金' } },
    { name: 'media_clue_bonus', type: 'double', interface: 'number', uiSchema: { title: '新媒体线索量奖金' } },
    { name: 'media_deal_commission', type: 'double', interface: 'number', uiSchema: { title: '新媒体成交提成' } },
    { name: 'media_clue_commission', type: 'double', interface: 'number', uiSchema: { title: '新媒体线索量提成' } },
    { name: 'media_team_bonus', type: 'double', interface: 'number', uiSchema: { title: '新媒体团队奖励' } },
    { name: 'rental_commission', type: 'double', interface: 'number', uiSchema: { title: '租房提成' } },
    { name: 'overseas_commission', type: 'double', interface: 'number', uiSchema: { title: '境外服务提成' } },
    { name: 'partner_free_commission', type: 'double', interface: 'number', uiSchema: { title: '代理方免费模式提成' } },
    { name: 'partner_paid_offer_commission', type: 'double', interface: 'number', uiSchema: { title: '代理方收费-Offer提成' } },
    { name: 'partner_paid_enroll_commission', type: 'double', interface: 'number', uiSchema: { title: '代理方收费-入学提成' } },
    { name: 'channel_refer_commission', type: 'double', interface: 'number', uiSchema: { title: '渠道推荐提成' } },
    { name: 'rental_profit_commission', type: 'double', interface: 'number', uiSchema: { title: '租房净利润提成' } },
    { name: 'net_salary', type: 'double', interface: 'number', uiSchema: { title: '实发工资' } },
  ];
  for (const f of salaryFields) {
    await apiPost('/api/collections/salaries/fields:create', f);
    console.log(`  + field: ${f.name}`);
  }
}

// ============================================================
// Step 3: 创建新表
// ============================================================
async function step3_createNewTables() {
  console.log('\n' + '='.repeat(60));
  console.log('Step 3: 创建新表');
  console.log('='.repeat(60));

  const newTables = [
    // ---- clients 客户主表 ----
    {
      name: 'clients',
      title: '客户主表',
      fields: [
        { name: 'name', type: 'string', interface: 'input', uiSchema: { title: '姓名', 'x-component': 'Input', required: true } },
        { name: 'phone', type: 'string', interface: 'phone', uiSchema: { title: '电话' } },
        { name: 'wechat', type: 'string', interface: 'input', uiSchema: { title: '微信' } },
        { name: 'email', type: 'string', interface: 'email', uiSchema: { title: '邮箱' } },
        { name: 'notes', type: 'text', interface: 'textarea', uiSchema: { title: '备注' } },
      ]
    },
    // ---- study_abroad_deals 留学业务 ----
    {
      name: 'study_abroad_deals',
      title: '留学业务',
      fields: [
        { name: 'source', type: 'string', interface: 'select', uiSchema: { title: '线索来源', 'x-component': 'Select', required: true, enum: [
          { value: 'xhs', label: '新媒体-小红书' },
          { value: 'douyin', label: '新媒体-抖音' },
          { value: 'video_account', label: '新媒体-视频号' },
          { value: 'live_douyin', label: '新媒体-直播抖音' },
          { value: 'live_video', label: '新媒体-直播视频号' },
          { value: 'word_of_mouth', label: '新媒体-口碑介绍' },
          { value: 'market_partner', label: '市场-合作方' },
          { value: 'market_wom', label: '市场-口碑介绍' },
          { value: 'market_social', label: '市场-社交平台' },
          { value: 'site_group', label: '站群' },
          { value: 'consultant_self', label: '顾问自有' },
          { value: 'cross_rental', label: '租房转化' },
          { value: 'cross_overseas', label: '境外服务转化' },
        ]}},
        { name: 'source_detail', type: 'text', interface: 'textarea', uiSchema: { title: '来源详情' } },
        { name: 'status', type: 'string', interface: 'select', uiSchema: { title: '状态', 'x-component': 'Select', required: true, defaultValue: 'new', enum: [
          { value: 'new', label: '新线索' },
          { value: 'contacted', label: '已联系' },
          { value: 'following', label: '跟进中' },
          { value: 'signed', label: '已签约' },
          { value: 'abandoned', label: '已放弃' },
        ]}},
        { name: 'service_type', type: 'string', interface: 'select', uiSchema: { title: '服务类型', 'x-component': 'Select', enum: [
          { value: 'study_abroad', label: '留学申请' },
          { value: 'background', label: '背景提升' },
          { value: 'other', label: '其他' },
        ]}},
        { name: 'signed_at', type: 'date', interface: 'datetime', uiSchema: { title: '签约日期' } },
        { name: 'remark', type: 'text', interface: 'textarea', uiSchema: { title: '备注' } },
        // 关联字段稍后通过 belongsTo 创建
      ]
    },
    // ---- study_intentions 留学意向 ----
    {
      name: 'study_intentions',
      title: '留学意向',
      fields: [
        { name: 'country', type: 'string', interface: 'input', uiSchema: { title: '目标国家', 'x-component': 'Input' } },
        { name: 'school', type: 'string', interface: 'input', uiSchema: { title: '目标学校' } },
        { name: 'major', type: 'string', interface: 'input', uiSchema: { title: '目标专业' } },
        { name: 'education_level', type: 'string', interface: 'select', uiSchema: { title: '申请学位', 'x-component': 'Select', enum: [
          { value: 'bachelor', label: '本科' },
          { value: 'master', label: '硕士' },
          { value: 'phd', label: '博士' },
          { value: 'other', label: '其他' },
        ]}},
        { name: 'priority', type: 'string', interface: 'select', uiSchema: { title: '优先级', 'x-component': 'Select', enum: [
          { value: 'first', label: '第一志愿' },
          { value: 'second', label: '第二志愿' },
          { value: 'third', label: '第三志愿' },
        ]}},
      ]
    },
    // ---- rental_deals 租房业务 ----
    {
      name: 'rental_deals',
      title: '租房业务',
      fields: [
        { name: 'source', type: 'string', interface: 'select', uiSchema: { title: '线索来源', 'x-component': 'Select', required: true, enum: [
          { value: 'xhs', label: '新媒体-小红书' },
          { value: 'douyin', label: '新媒体-抖音' },
          { value: 'video_account', label: '新媒体-视频号' },
          { value: 'live_douyin', label: '新媒体-直播抖音' },
          { value: 'live_video', label: '新媒体-直播视频号' },
          { value: 'word_of_mouth', label: '新媒体-口碑介绍' },
          { value: 'market_partner', label: '市场-合作方' },
          { value: 'market_wom', label: '市场-口碑介绍' },
          { value: 'market_social', label: '市场-社交平台' },
          { value: 'site_group', label: '站群' },
          { value: 'consultant_self', label: '顾问自有' },
          { value: 'cross_study', label: '留学转化' },
          { value: 'cross_overseas', label: '境外服务转化' },
        ]}},
        { name: 'source_detail', type: 'text', interface: 'textarea', uiSchema: { title: '来源详情' } },
        { name: 'status', type: 'string', interface: 'select', uiSchema: { title: '状态', 'x-component': 'Select', required: true, defaultValue: 'new', enum: [
          { value: 'new', label: '新线索' },
          { value: 'contacted', label: '已联系' },
          { value: 'following', label: '跟进中' },
          { value: 'closed', label: '已成交' },
          { value: 'abandoned', label: '已放弃' },
        ]}},
        { name: 'target_city', type: 'string', interface: 'input', uiSchema: { title: '目标城市' } },
        { name: 'budget', type: 'double', interface: 'number', uiSchema: { title: '预算' } },
        { name: 'move_in_date', type: 'date', interface: 'datetime', uiSchema: { title: '入住时间' } },
        { name: 'rent_amount', type: 'double', interface: 'number', uiSchema: { title: '房租金额' } },
        { name: 'lease_term', type: 'string', interface: 'select', uiSchema: { title: '租期', 'x-component': 'Select', enum: [
          { value: '3months', label: '3个月' },
          { value: '6months', label: '6个月' },
          { value: '12months', label: '12个月' },
        ]}},
        { name: 'rental_type', type: 'string', interface: 'select', uiSchema: { title: '房源类型', 'x-component': 'Select', enum: [
          { value: 'sg_self_c', label: '新加坡自有C端' },
          { value: 'sg_self_b', label: '新加坡自有B端' },
          { value: 'asia_student', label: '亚洲留学生公寓' },
          { value: 'leyu', label: '乐寓租房' },
          { value: 'other', label: '其他' },
        ]}},
        { name: 'remark', type: 'text', interface: 'textarea', uiSchema: { title: '备注' } },
      ]
    },
    // ---- overseas_service_deals 境外服务 ----
    {
      name: 'overseas_service_deals',
      title: '境外服务',
      fields: [
        { name: 'source', type: 'string', interface: 'select', uiSchema: { title: '线索来源', 'x-component': 'Select', required: true, enum: [
          { value: 'xhs', label: '新媒体-小红书' },
          { value: 'douyin', label: '新媒体-抖音' },
          { value: 'video_account', label: '新媒体-视频号' },
          { value: 'live_douyin', label: '新媒体-直播抖音' },
          { value: 'live_video', label: '新媒体-直播视频号' },
          { value: 'word_of_mouth', label: '新媒体-口碑介绍' },
          { value: 'market_partner', label: '市场-合作方' },
          { value: 'market_wom', label: '市场-口碑介绍' },
          { value: 'market_social', label: '市场-社交平台' },
          { value: 'site_group', label: '站群' },
          { value: 'consultant_self', label: '顾问自有' },
          { value: 'cross_study', label: '留学转化' },
          { value: 'cross_rental', label: '租房转化' },
        ]}},
        { name: 'source_detail', type: 'text', interface: 'textarea', uiSchema: { title: '来源详情' } },
        { name: 'status', type: 'string', interface: 'select', uiSchema: { title: '状态', 'x-component': 'Select', required: true, defaultValue: 'new', enum: [
          { value: 'new', label: '新线索' },
          { value: 'contacted', label: '已联系' },
          { value: 'following', label: '跟进中' },
          { value: 'closed', label: '已成交' },
          { value: 'abandoned', label: '已放弃' },
        ]}},
        { name: 'service_type', type: 'string', interface: 'select', uiSchema: { title: '服务类型', 'x-component': 'Select', enum: [
          { value: 'pickup', label: '接机' },
          { value: 'pickup_accompany', label: '接机+陪同' },
          { value: 'accommodation', label: '住宿' },
          { value: 'visa_renewal', label: '续签' },
          { value: 'other', label: '其他' },
        ]}},
        { name: 'fee_amount', type: 'double', interface: 'number', uiSchema: { title: '服务费用' } },
        { name: 'remark', type: 'text', interface: 'textarea', uiSchema: { title: '备注' } },
      ]
    },
    // ---- document_progress 文书进度 ----
    {
      name: 'document_progress',
      title: '文书进度',
      fields: [
        { name: 'status', type: 'string', interface: 'select', uiSchema: { title: '文书状态', 'x-component': 'Select', required: true, defaultValue: 'material', enum: [
          { value: 'material', label: '材料准备' },
          { value: 'submit', label: '递交Offer' },
          { value: 'offer_waiting', label: 'Offer等待' },
          { value: 'visa_submit', label: '签证递交' },
          { value: 'visa_waiting', label: '签证等待' },
          { value: 'enrollment', label: '到校注册' },
          { value: 'completed', label: '已完成' },
        ]}},
        { name: 'material_start', type: 'date', interface: 'datetime', uiSchema: { title: '材料准备开始' } },
        { name: 'material_end', type: 'date', interface: 'datetime', uiSchema: { title: '材料准备完成' } },
        { name: 'visa_type', type: 'string', interface: 'input', uiSchema: { title: '签证类型' } },
        { name: 'visa_submit_date', type: 'date', interface: 'datetime', uiSchema: { title: '签证递交日期' } },
        { name: 'visa_result', type: 'string', interface: 'select', uiSchema: { title: '签证结果', 'x-component': 'Select', enum: [
          { value: 'approved', label: '通过' },
          { value: 'rejected', label: '拒签' },
        ]}},
        { name: 'visa_result_date', type: 'date', interface: 'datetime', uiSchema: { title: '签证结果日期' } },
        { name: 'enrollment_date', type: 'date', interface: 'datetime', uiSchema: { title: '到校注册日期' } },
        { name: 'completed_date', type: 'date', interface: 'datetime', uiSchema: { title: '完成日期' } },
        { name: 'remark', type: 'text', interface: 'textarea', uiSchema: { title: '备注' } },
      ]
    },
    // ---- applications 申请记录（新） ----
    {
      name: 'applications',
      title: '申请记录',
      fields: [
        { name: 'school_name', type: 'string', interface: 'input', uiSchema: { title: '学校名称', 'x-component': 'Input' } },
        { name: 'major', type: 'string', interface: 'input', uiSchema: { title: '专业' } },
        { name: 'submit_date', type: 'date', interface: 'datetime', uiSchema: { title: '递交日期' } },
        { name: 'app_status', type: 'string', interface: 'select', uiSchema: { title: '申请状态', 'x-component': 'Select', enum: [
          { value: 'pending', label: '待递交' },
          { value: 'submitted', label: '已递交' },
          { value: 'admitted', label: '已录取' },
          { value: 'rejected', label: '已拒绝' },
        ]}},
        { name: 'remark', type: 'text', interface: 'textarea', uiSchema: { title: '备注' } },
      ]
    },
    // ---- websites 站群管理 ----
    {
      name: 'websites',
      title: '站群管理',
      fields: [
        { name: 'site_name', type: 'string', interface: 'input', uiSchema: { title: '网站名称', 'x-component': 'Input', required: true } },
        { name: 'site_url', type: 'string', interface: 'input', uiSchema: { title: '网址' } },
        { name: 'server_name', type: 'string', interface: 'input', uiSchema: { title: '所在服务器' } },
        { name: 'server_account', type: 'string', interface: 'input', uiSchema: { title: '服务器账号' } },
        { name: 'server_password', type: 'string', interface: 'input', uiSchema: { title: '服务器密码' } },
        { name: 'real_name_auth', type: 'string', interface: 'input', uiSchema: { title: '实名认证' } },
        { name: 'bound_phone', type: 'string', interface: 'phone', uiSchema: { title: '绑定手机号' } },
        { name: 'domain_name', type: 'string', interface: 'input', uiSchema: { title: '域名' } },
        { name: 'domain_server', type: 'string', interface: 'input', uiSchema: { title: '域名服务器' } },
        { name: 'domain_expire_date', type: 'date', interface: 'datetime', uiSchema: { title: '域名到期时间' } },
        { name: 'domain_fee', type: 'double', interface: 'number', uiSchema: { title: '域名管理费' } },
        { name: 'status', type: 'string', interface: 'select', uiSchema: { title: '状态', 'x-component': 'Select', defaultValue: 'normal', enum: [
          { value: 'normal', label: '正常' },
          { value: 'abnormal', label: '异常' },
          { value: 'stopped', label: '已停用' },
        ]}},
      ]
    },
    // ---- media_performance 新媒体业绩 ----
    {
      name: 'media_performance',
      title: '新媒体业绩',
      fields: [
        { name: 'record_month', type: 'string', interface: 'input', uiSchema: { title: '记录月份', 'x-component': 'Input', required: true } },
        { name: 'platform', type: 'string', interface: 'select', uiSchema: { title: '平台', 'x-component': 'Select', enum: [
          { value: 'xhs', label: '小红书' },
          { value: 'douyin', label: '抖音' },
          { value: 'video_account', label: '视频号' },
          { value: 'live_douyin', label: '直播-抖音' },
          { value: 'live_video', label: '直播-视频号' },
        ]}},
        { name: 'post_count', type: 'integer', interface: 'integer', uiSchema: { title: '发布篇数' } },
        { name: 'view_count', type: 'integer', interface: 'integer', uiSchema: { title: '总浏览量' } },
        { name: 'view_above_5000', type: 'integer', interface: 'integer', uiSchema: { title: '＞5000浏览量篇数' } },
        { name: 'view_above_10000', type: 'integer', interface: 'integer', uiSchema: { title: '＞10000浏览量篇数' } },
        { name: 'clue_count', type: 'integer', interface: 'integer', uiSchema: { title: '月线索量' } },
        { name: 'deal_count', type: 'integer', interface: 'integer', uiSchema: { title: '成交单数' } },
        { name: 'clue_unit_price', type: 'double', interface: 'number', uiSchema: { title: '线索单价' } },
        { name: 'clue_commission', type: 'double', interface: 'number', uiSchema: { title: '线索量提成金额' } },
        { name: 'view_bonus', type: 'double', interface: 'number', uiSchema: { title: '浏览量奖金' } },
        { name: 'deal_commission', type: 'double', interface: 'number', uiSchema: { title: '成交提成' } },
        { name: 'team_bonus', type: 'double', interface: 'number', uiSchema: { title: '团队奖励' } },
        { name: 'remark', type: 'text', interface: 'textarea', uiSchema: { title: '备注' } },
      ]
    },
  ];

  for (const table of newTables) {
    console.log(`\n--- 创建 ${table.name} ---`);
    // 先创建 collection
    const createRes = await apiPost('/api/collections:create', {
      name: table.name,
      title: table.title,
      inherit: false,
      autoCreate: true,
    });
    if (!createRes || !createRes.data) {
      console.log(`  FAILED to create collection ${table.name}`);
      continue;
    }
    console.log(`  Collection created: ${table.name}`);

    // 批量创建字段
    for (const f of table.fields) {
      const fieldRes = await apiPost(`/api/collections/${table.name}/fields:create`, f);
      if (fieldRes && fieldRes.data) {
        console.log(`  + ${f.name} (${f.type})`);
      } else {
        console.log(`  FAILED: ${f.name}`);
      }
    }
  }
}

// ============================================================
// Step 4: 配置关联关系
// ============================================================
async function step4_createRelations() {
  console.log('\n' + '='.repeat(60));
  console.log('Step 4: 配置关联关系');
  console.log('='.repeat(60));

  const relations = [
    // study_abroad_deals 的关联
    { table: 'study_abroad_deals', name: 'client', target: 'clients', foreignKey: 'client_id', title: '客户' },
    { table: 'study_abroad_deals', name: 'owner', target: 'employees', foreignKey: 'owner_id', title: '录入人' },
    { table: 'study_abroad_deals', name: 'consultant', target: 'employees', foreignKey: 'consultant_id', title: '顾问' },
    { table: 'study_abroad_deals', name: 'copywriter', target: 'employees', foreignKey: 'copywriter_id', title: '文书老师' },

    // study_intentions 的关联
    { table: 'study_intentions', name: 'deal', target: 'study_abroad_deals', foreignKey: 'deal_id', title: '留学业务' },

    // rental_deals 的关联
    { table: 'rental_deals', name: 'client', target: 'clients', foreignKey: 'client_id', title: '客户' },
    { table: 'rental_deals', name: 'owner', target: 'employees', foreignKey: 'owner_id', title: '录入人' },
    { table: 'rental_deals', name: 'market', target: 'employees', foreignKey: 'market_id', title: '市场负责人' },
    { table: 'rental_deals', name: 'consultant', target: 'employees', foreignKey: 'consultant_id', title: '协助顾问' },
    { table: 'rental_deals', name: 'partner', target: 'partners', foreignKey: 'partner_id', title: '租房第三方' },

    // overseas_service_deals 的关联
    { table: 'overseas_service_deals', name: 'client', target: 'clients', foreignKey: 'client_id', title: '客户' },
    { table: 'overseas_service_deals', name: 'owner', target: 'employees', foreignKey: 'owner_id', title: '录入人' },
    { table: 'overseas_service_deals', name: 'handler', target: 'employees', foreignKey: 'handler_id', title: '负责人' },
    { table: 'overseas_service_deals', name: 'partner', target: 'partners', foreignKey: 'partner_id', title: '第三方' },

    // document_progress 的关联
    { table: 'document_progress', name: 'deal', target: 'study_abroad_deals', foreignKey: 'deal_id', title: '留学业务' },
    { table: 'document_progress', name: 'copywriter', target: 'employees', foreignKey: 'copywriter_id', title: '文书老师' },

    // applications 的关联
    { table: 'applications', name: 'progress', target: 'document_progress', foreignKey: 'progress_id', title: '文书进度' },

    // contracts 的关联
    { table: 'contracts', name: 'client', target: 'clients', foreignKey: 'client_id', title: '客户' },
    { table: 'contracts', name: 'deal', target: 'study_abroad_deals', foreignKey: 'deal_id', title: '留学业务' },
    { table: 'contracts', name: 'salesperson', target: 'employees', foreignKey: 'salesperson_id', title: '签约顾问' },

    // payments 的关联
    { table: 'payments', name: 'client', target: 'clients', foreignKey: 'client_id', title: '客户' },

    // offers 的关联
    { table: 'offers', name: 'application', target: 'applications', foreignKey: 'application_id', title: '申请记录' },

    // follow_up_records 的关联
    { table: 'follow_up_records', name: 'employee', target: 'employees', foreignKey: 'employee_id', title: '跟进人' },

    // media_performance 的关联
    { table: 'media_performance', name: 'employee', target: 'employees', foreignKey: 'employee_id', title: '员工' },
    { table: 'media_performance', name: 'asset', target: 'assets', foreignKey: 'asset_id', title: '新媒体资产' },

    // websites 的关联
    { table: 'websites', name: 'owner', target: 'employees', foreignKey: 'owner_id', title: '负责人' },
  ];

  for (const rel of relations) {
    const data = {
      name: rel.name,
      type: 'belongsTo',
      target: rel.target,
      foreignKey: rel.foreignKey,
      interface: 'm2o',
      uiSchema: { title: rel.title, 'x-component': 'AssociationField' }
    };
    const res = await apiPost(`/api/collections/${rel.table}/fields:create`, data);
    if (res && res.data) {
      console.log(`  OK: ${rel.table}.${rel.name} -> ${rel.target}`);
    } else {
      console.log(`  FAIL: ${rel.table}.${rel.name} -> ${rel.target}`);
    }
  }
}

// ============================================================
// Step 5: 清理旧 UI schema 和菜单
// ============================================================
async function step5_cleanupUI() {
  console.log('\n' + '='.repeat(60));
  console.log('Step 5: 清理旧 UI');
  console.log('='.repeat(60));

  // 删除旧 desktopRoutes
  const routes = await apiGet('/api/desktopRoutes:list', { pageSize: 500 });
  for (const item of (routes.data || [])) {
    const id = item.id;
    if (id) {
      await apiDelete(`/api/desktopRoutes/${id}`);
    }
  }
  console.log(`  Cleared ${(routes.data || []).length} desktopRoutes`);

  // 删除旧 uiSchemas
  const schemas = await apiGet('/api/uiSchemas:list', { pageSize: 2000 });
  let deleted = 0;
  for (const item of (schemas.data || [])) {
    const uid = item['x-uid'];
    if (uid) {
      const ok = await apiDelete(`/api/uiSchemas/${uid}`);
      if (ok) deleted++;
    }
  }
  console.log(`  Cleared ${deleted} uiSchemas`);
}

// ============================================================
// Step 6: 创建新 UI 页面和菜单
// ============================================================
async function step6_createUI() {
  console.log('\n' + '='.repeat(60));
  console.log('Step 6: 创建 UI 页面和菜单');
  console.log('='.repeat(60));

  // 所有业务表
  const pageConfigs = [
    { name: 'clients-page', title: '客户主表', collection: 'clients' },
    { name: 'study-abroad-page', title: '留学线索', collection: 'study_abroad_deals' },
    { name: 'study-intentions-page', title: '留学意向', collection: 'study_intentions' },
    { name: 'rental-page', title: '租房线索', collection: 'rental_deals' },
    { name: 'overseas-page', title: '境外服务线索', collection: 'overseas_service_deals' },
    { name: 'follow-up-page', title: '跟进记录', collection: 'follow_up_records' },
    { name: 'document-progress-page', title: '文书进度', collection: 'document_progress' },
    { name: 'applications-page', title: '申请记录', collection: 'applications' },
    { name: 'offers-page', title: 'Offer管理', collection: 'offers' },
    { name: 'contracts-page', title: '合同管理', collection: 'contracts' },
    { name: 'payments-page', title: '收款记录', collection: 'payments' },
    { name: 'rebates-page', title: '返佣管理', collection: 'rebates' },
    { name: 'partners-page', title: '合作方管理', collection: 'partners' },
    { name: 'websites-page', title: '站群管理', collection: 'websites' },
    { name: 'assets-page', title: '新媒体资产', collection: 'assets' },
    { name: 'employees-page', title: '员工管理', collection: 'employees' },
    { name: 'salaries-page', title: '薪资管理', collection: 'salaries' },
    { name: 'commission-page', title: '提成明细', collection: 'commission_details' },
    { name: 'media-perf-page', title: '新媒体业绩', collection: 'media_performance' },
  ];

  const pageUids = {};

  for (const pc of pageConfigs) {
    const schema = makePageSchema(pc.name, pc.title, pc.collection);
    const res = await apiPost('/api/uiSchemas:insert', schema);
    if (res && res.data) {
      const uid = res.data['x-uid'];
      pageUids[pc.name] = uid;
      console.log(`  OK: ${pc.title} -> ${uid}`);
    } else {
      pageUids[pc.name] = null;
      console.log(`  FAIL: ${pc.title}`);
    }
  }

  // 创建仪表盘
  const dashSchema = makeDashboardSchema();
  const dashRes = await apiPost('/api/uiSchemas:insert', dashSchema);
  if (dashRes && dashRes.data) {
    pageUids['dashboard-page'] = dashRes.data['x-uid'];
    console.log(`  OK: 数据看板 -> ${pageUids['dashboard-page']}`);
  }

  // 创建菜单结构
  const menuGroups = [
    {
      title: '数据看板',
      icon: 'DashboardOutlined',
      items: [{ title: '数据看板', icon: 'DashboardOutlined', schema: pageUids['dashboard-page'] }]
    },
    {
      title: '学生管理',
      icon: 'UserOutlined',
      items: [
        { title: '客户主表', icon: 'IdcardOutlined', schema: pageUids['clients-page'] },
        { title: '留学线索', icon: 'SendOutlined', schema: pageUids['study-abroad-page'] },
        { title: '留学意向', icon: 'AimOutlined', schema: pageUids['study-intentions-page'] },
        { title: '租房线索', icon: 'HomeOutlined', schema: pageUids['rental-page'] },
        { title: '境外服务线索', icon: 'GlobalOutlined', schema: pageUids['overseas-page'] },
        { title: '跟进记录', icon: 'ScheduleOutlined', schema: pageUids['follow-up-page'] },
      ]
    },
    {
      title: '文书与申请',
      icon: 'FileTextOutlined',
      items: [
        { title: '文书进度', icon: 'SolutionOutlined', schema: pageUids['document-progress-page'] },
        { title: '申请记录', icon: 'FormOutlined', schema: pageUids['applications-page'] },
        { title: 'Offer管理', icon: 'TrophyOutlined', schema: pageUids['offers-page'] },
      ]
    },
    {
      title: '合同与财务',
      icon: 'DollarOutlined',
      items: [
        { title: '合同管理', icon: 'FileProtectOutlined', schema: pageUids['contracts-page'] },
        { title: '收款记录', icon: 'AccountBookOutlined', schema: pageUids['payments-page'] },
        { title: '返佣管理', icon: 'SwapOutlined', schema: pageUids['rebates-page'] },
      ]
    },
    {
      title: '合作与资产',
      icon: 'ApartmentOutlined',
      items: [
        { title: '合作方管理', icon: 'TeamOutlined', schema: pageUids['partners-page'] },
        { title: '站群管理', icon: 'CloudServerOutlined', schema: pageUids['websites-page'] },
        { title: '新媒体资产', icon: 'PlaySquareOutlined', schema: pageUids['assets-page'] },
      ]
    },
    {
      title: '人事管理',
      icon: 'TeamOutlined',
      items: [
        { title: '员工管理', icon: 'ContactsOutlined', schema: pageUids['employees-page'] },
        { title: '薪资管理', icon: 'WalletOutlined', schema: pageUids['salaries-page'] },
        { title: '提成明细', icon: 'PercentageOutlined', schema: pageUids['commission-page'] },
        { title: '新媒体业绩', icon: 'BarChartOutlined', schema: pageUids['media-perf-page'] },
      ]
    },
  ];

  console.log('\n--- 创建菜单 ---');
  for (const group of menuGroups) {
    if (group.items.length === 1) {
      const item = group.items[0];
      if (!item.schema) continue;
      const res = await apiPost('/api/desktopRoutes:create', {
        title: item.title, icon: item.icon, schemaUid: item.schema
      });
      if (res && res.data) console.log(`  OK: ${item.title}`);
    } else {
      const res = await apiPost('/api/desktopRoutes:create', {
        title: group.title, icon: group.icon
      });
      if (res && res.data) {
        const groupId = res.data.id;
        console.log(`  OK: [Group] ${group.title} (id=${groupId})`);
        for (const item of group.items) {
          if (!item.schema) continue;
          const subRes = await apiPost('/api/desktopRoutes:create', {
            title: item.title, icon: item.icon,
            schemaUid: item.schema, parentId: groupId
          });
          if (subRes && subRes.data) console.log(`    OK: ${item.title}`);
        }
      }
    }
  }
}

// ============================================================
// Step 7: 分配菜单权限
// ============================================================
async function step7_assignPermissions() {
  console.log('\n' + '='.repeat(60));
  console.log('Step 7: 分配菜单权限');
  console.log('='.repeat(60));

  const routes = await apiGet('/api/desktopRoutes:list', { pageSize: 100 });
  const routeIds = (routes.data || []).map(r => r.id);

  const roles = await apiGet('/api/roles:list', { pageSize: 50 });
  for (const role of (roles.data || [])) {
    const roleName = role.name;
    for (const rid of routeIds) {
      await apiPost('/api/rolesDesktopRoutes:create', {
        roleName: roleName,
        desktopRouteId: rid
      });
    }
    console.log(`  OK: ${roleName} -> ${routeIds.length} routes`);
  }
}

// ============================================================
// 辅助函数：生成页面 schema
// ============================================================
function makePageSchema(pageName, pageTitle, collection) {
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
                      size: 'middle'
                    },
                    'x-designer': 'TableBlockDesigner',
                    'x-collection': collection,
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
                                        properties: {}
                                      },
                                      footer: {
                                        type: 'void',
                                        'x-component': 'Action.Drawer.FootBar',
                                        properties: {
                                          submit: {
                                            type: 'void',
                                            title: '{{ t(\"Submit\") }}',
                                            'x-component': 'Action',
                                            'x-component-props': { type: 'primary', htmlType: 'submit', useAction: '{{ useSubmitAction }}' },
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          delete: {
                            type: 'void',
                            'x-action': 'destroy',
                            'x-component': 'Action',
                            'x-component-props': { useAction: '{{ useBulkDestroyAction }}' },
                            'x-designer': 'ActionDesigner',
                            'x-settings': 'actionSettings',
                            'x-align': 'left',
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
    }
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
                      }
                    }
                  }
                }
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
                      }
                    }
                  }
                }
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
                      }
                    }
                  }
                }
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
                      }
                    }
                  }
                }
              },
            }
          }
        }
      }
    }
  };
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('新辰未来管理系统 - NocoBase 完整重构');
  console.log('NocoBase: ' + BASE);
  console.log('');

  await step1_dropOldTables();
  await step2_updateExistingTables();
  await step3_createNewTables();
  await step4_createRelations();
  await step5_cleanupUI();
  await step6_createUI();
  await step7_assignPermissions();

  console.log('\n' + '='.repeat(60));
  console.log('重构完成！');
  console.log('='.repeat(60));
  console.log('\n后台地址: ' + BASE + '/admin');
}

main().catch(console.error);
