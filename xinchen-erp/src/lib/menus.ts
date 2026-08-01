/**
 * 菜单 + 部门架构（混合方案）
 *
 * 前端按部门展示菜单，后端数据按业务线组织。
 * - MENU_TREE: 管理员/总经理全量菜单
 * - DEPARTMENT_MENUS: 各部门专属菜单
 * - ROLE_DEPARTMENT_MAP: 角色 → 部门映射
 */

export interface MenuNode {
  name: string;
  code: string;
  path?: string;
  icon: string;
  children?: MenuNode[];
}

// ============================================
// 角色 → 部门映射
// ============================================
export const ROLE_DEPARTMENT_MAP: Record<string, { dept: string; isManagement: boolean }> = {
  admin:                 { dept: "管理", isManagement: true },
  general_manager:       { dept: "管理", isManagement: true },
  operations_director:   { dept: "管理", isManagement: true },
  // 市场部（拆分为三）
  newmedia_manager:      { dept: "新媒体部", isManagement: false },
  newmedia_operator:     { dept: "新媒体部", isManagement: false },
  marketing_specialist:  { dept: "市场部", isManagement: false },
  network_operator:      { dept: "网络部", isManagement: false },
  live_streamer:         { dept: "网络部", isManagement: false },
  // 其余
  academic_advisor:      { dept: "咨询部", isManagement: false },
  document_application:  { dept: "交付部", isManagement: false },
  finance:               { dept: "财务部", isManagement: false },
};

// ============================================
// 全量菜单树（管理员/总经理）
// ============================================
export const MENU_TREE: MenuNode[] = [
  { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
  {
    name: "新媒体部", code: "dept_newmedia", icon: "media",
    children: [
      { name: "新媒体账号", code: "media", path: "/media-accounts", icon: "media" },
      { name: "触点管理", code: "touchpoints", path: "/touchpoints", icon: "touchpoints" },
    ],
  },
  {
    name: "市场部", code: "dept_marketing", icon: "leads",
    children: [
      { name: "线索管理", code: "leads", path: "/leads", icon: "leads" },
      { name: "线索流转", code: "leadflow", path: "/lead-flow", icon: "leadFlow" },
      { name: "客户回访", code: "visits", icon: "visits", children: [
        { name: "回访记录", code: "visit_records", path: "/visit-records", icon: "visits" },
        { name: "回访计划", code: "visit_plans", path: "/visit-plans", icon: "visitPlan" },
        { name: "满意度调查", code: "surveys", path: "/success/surveys", icon: "success" },
        { name: "投诉管理", code: "complaints", path: "/success/complaints", icon: "success" },
        { name: "转介绍", code: "referrals", path: "/success/referrals", icon: "success" },
      ]},
    ],
  },
  {
    name: "网络部", code: "dept_network", icon: "sites",
    children: [
      { name: "站群管理", code: "sites_mgmt", icon: "sites", children: [
        { name: "站点列表", code: "sites", path: "/sites", icon: "sites" },
        { name: "公司模板", code: "company_templates", path: "/company-templates", icon: "template" },
        { name: "服务器", code: "servers", path: "/servers", icon: "server" },
      ]},
      { name: "归因结果", code: "attributions", path: "/attributions", icon: "attributions" },
      { name: "渠道ROI", code: "channel_roi", path: "/channel-roi", icon: "channelRoi" },
    ],
  },
  {
    name: "咨询部", code: "dept_consulting", icon: "leads",
    children: [
      { name: "线索管理", code: "leads", path: "/leads", icon: "leads" },
      { name: "待跟进", code: "sales_followup_pending", path: "/followups/pending", icon: "followup" },
      { name: "意向客户", code: "sales_followup_interested", path: "/followups/interested", icon: "followup" },
      { name: "已签约客户", code: "sales_followup_signed", path: "/followups/signed", icon: "followup" },
      { name: "合同管理", code: "contracts", path: "/contracts", icon: "contracts" },
      { name: "回访记录", code: "visit_records", path: "/visit-records", icon: "visits" },
      { name: "回访计划", code: "visit_plans", path: "/visit-plans", icon: "visitPlan" },
    ],
  },
  {
    name: "交付部", code: "dept_delivery", icon: "applications",
    children: [
      { name: "学生档案", code: "students", path: "/students", icon: "students" },
      { name: "申请管理", code: "applications", path: "/applications", icon: "applications" },
      { name: "签证管理", code: "visas", path: "/visas", icon: "visas" },
      { name: "合作院校", code: "partner_schools", path: "/partner-schools", icon: "partners" },
    ],
  },
  {
    name: "财务部", code: "dept_finance", icon: "payments",
    children: [
      { name: "收款管理", code: "payments", path: "/payments", icon: "payments" },
      { name: "收入确认", code: "incomes", path: "/incomes", icon: "incomes" },
      { name: "应收账款", code: "receivables", path: "/receivables", icon: "receivables" },
      { name: "应付账款", code: "payables", path: "/payables", icon: "payables" },
      { name: "发票管理", code: "invoices", path: "/invoices", icon: "invoices" },
      { name: "退费管理", code: "refunds", path: "/refunds", icon: "refunds" },
      { name: "成本管理", code: "costs", path: "/costs", icon: "costs" },
      { name: "提成管理", code: "commissions", path: "/commissions", icon: "commissions" },
      { name: "提成规则", code: "commission_rules", path: "/commission-rules", icon: "commissions" },
      { name: "薪资管理", code: "salaries", path: "/salaries", icon: "salaries" },
      { name: "报销管理", code: "reimbursements", path: "/reimbursements", icon: "reimbursements" },
      { name: "利润报表", code: "profit_reports", path: "/profit-reports", icon: "profit" },
    ],
  },
  { name: "合作方管理", code: "partners_mgmt", icon: "partners",
    children: [
      { name: "合作方", code: "partners", path: "/partners", icon: "partners" },
    ],
  },
  {
    name: "扩展业务", code: "extended", icon: "rental",
    children: [
      { name: "租房管理", code: "rental", path: "/rental", icon: "rental" },
      { name: "境外服务", code: "overseas", path: "/overseas-services", icon: "overseas" },
    ],
  },
  {
    name: "产品资源", code: "product", icon: "product",
    children: [
      { name: "国家管理", code: "countries", path: "/product/countries", icon: "product" },
      { name: "院校管理", code: "institutions", path: "/product/institutions", icon: "product" },
      { name: "专业管理", code: "majors", path: "/product/majors", icon: "product" },
      { name: "产品管理", code: "products", path: "/product/products", icon: "product" },
      { name: "产品套餐", code: "product_packages", path: "/product/packages", icon: "product" },
    ],
  },
  {
    name: "风险管理", code: "risk", icon: "risk",
    children: [
      { name: "风险看板", code: "risk_dashboard", path: "/risk/dashboard", icon: "risk" },
      { name: "风险规则", code: "risk_rules", path: "/risk/rules", icon: "risk" },
    ],
  },
  {
    name: "经营驾驶舱", code: "bi", icon: "bi",
    children: [
      { name: "经营驾驶舱", code: "bi_dash", path: "/bi", icon: "bi" },
      { name: "数据大屏", code: "bi_screen", path: "/bi/screen", icon: "screen" },
    ],
  },
  {
    name: "系统设置", code: "settings", icon: "settings",
    children: [
      { name: "员工信息", code: "employees", path: "/employees", icon: "users" },
      { name: "组织架构", code: "organization", path: "/settings/org", icon: "organization" },
      { name: "角色权限", code: "roles", path: "/settings/roles", icon: "roles" },
      { name: "钉钉集成", code: "dingtalk", path: "/settings/dingtalk", icon: "dingtalk" },
      { name: "数据字典", code: "dicts", path: "/settings/dicts", icon: "dicts" },
      { name: "系统配置", code: "configs", path: "/settings/configs", icon: "configs" },
      { name: "审计日志", code: "audit", path: "/audit-logs", icon: "audit" },
      { name: "操作日志", code: "operation-logs", path: "/settings/operation-logs", icon: "audit" },
      { name: "登录日志", code: "login-logs", path: "/settings/login-logs", icon: "audit" },
    ],
  },
];

// ============================================
// 各部门专属菜单
// ============================================
export const DEPARTMENT_MENUS: Record<string, MenuNode[]> = {
  "新媒体部": [
    { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
    { name: "新媒体账号", code: "media", path: "/media-accounts", icon: "media" },
    { name: "触点管理", code: "touchpoints", path: "/touchpoints", icon: "touchpoints" },
    { name: "线索管理", code: "leads", path: "/leads", icon: "leads" },
  ],
  "市场部": [
    { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
    { name: "线索管理", code: "leads", path: "/leads", icon: "leads" },
    { name: "线索流转", code: "leadflow", path: "/lead-flow", icon: "leadFlow" },
    { name: "客户回访", code: "visits", icon: "visits", children: [
      { name: "回访记录", code: "visit_records", path: "/visit-records", icon: "visits" },
      { name: "回访计划", code: "visit_plans", path: "/visit-plans", icon: "visitPlan" },
      { name: "满意度调查", code: "surveys", path: "/success/surveys", icon: "success" },
      { name: "投诉管理", code: "complaints", path: "/success/complaints", icon: "success" },
      { name: "转介绍", code: "referrals", path: "/success/referrals", icon: "success" },
    ]},
  ],
  "网络部": [
    { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
    { name: "站群管理", code: "sites_mgmt", icon: "sites", children: [
      { name: "站点列表", code: "sites", path: "/sites", icon: "sites" },
      { name: "公司模板", code: "company_templates", path: "/company-templates", icon: "template" },
      { name: "服务器", code: "servers", path: "/servers", icon: "server" },
    ]},
    { name: "线索管理", code: "leads", path: "/leads", icon: "leads" },
    { name: "归因结果", code: "attributions", path: "/attributions", icon: "attributions" },
    { name: "渠道ROI", code: "channel_roi", path: "/channel-roi", icon: "channelRoi" },
  ],
  "咨询部": [
    { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
    { name: "线索管理", code: "leads", path: "/leads", icon: "leads" },
    { name: "待跟进", code: "sales_followup_pending", path: "/followups/pending", icon: "followup" },
    { name: "意向客户", code: "sales_followup_interested", path: "/followups/interested", icon: "followup" },
    { name: "已签约客户", code: "sales_followup_signed", path: "/followups/signed", icon: "followup" },
    { name: "合同管理", code: "contracts", path: "/contracts", icon: "contracts" },
    { name: "回访记录", code: "visit_records", path: "/visit-records", icon: "visits" },
    { name: "回访计划", code: "visit_plans", path: "/visit-plans", icon: "visitPlan" },
  ],
  "交付部": [
    { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
    { name: "学生档案", code: "students", path: "/students", icon: "students" },
    { name: "申请管理", code: "applications", path: "/applications", icon: "applications" },
    { name: "签证管理", code: "visas", path: "/visas", icon: "visas" },
    { name: "合作院校", code: "partner_schools", path: "/partner-schools", icon: "partners" },
  ],
  "财务部": [
    { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
    {
      name: "财务管理", code: "dept_finance", icon: "payments",
      children: [
        { name: "收款管理", code: "payments", path: "/payments", icon: "payments" },
        { name: "报销管理", code: "reimbursements", path: "/reimbursements", icon: "reimbursements" },
        { name: "成本管理", code: "costs", path: "/costs", icon: "costs" },
        { name: "提成管理", code: "commissions", path: "/commissions", icon: "commissions" },
        { name: "提成规则", code: "commission_rules", path: "/commission-rules", icon: "commissions" },
        { name: "薪资管理", code: "salaries", path: "/salaries", icon: "salaries" },
        { name: "利润报表", code: "profit_reports", path: "/profit-reports", icon: "profit" },
      ],
    },
  ],
};

/**
 * 根据角色列表获取应使用的菜单树。
 * - admin/总经理 → MENU_TREE（全量）
 * - 其他角色 → 找到第一个匹配的部门菜单
 */
export function getMenuTreeByRoles(roles: string[]): { tree: MenuNode[]; department: string; isManagement: boolean } {
  for (const role of roles) {
    const info = ROLE_DEPARTMENT_MAP[role];
    if (info?.isManagement) return { tree: MENU_TREE, department: "管理", isManagement: true };
  }
  for (const role of roles) {
    const info = ROLE_DEPARTMENT_MAP[role];
    if (info) return {
      tree: DEPARTMENT_MENUS[info.dept] || MENU_TREE,
      department: info.dept,
      isManagement: false,
    };
  }
  return { tree: MENU_TREE, department: "未知", isManagement: true };
}

/** 递归展开所有节点（含父级） */
export function flattenMenus(nodes: MenuNode[] = MENU_TREE): MenuNode[] {
  const out: MenuNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children?.length) out.push(...flattenMenus(n.children));
  }
  return out;
}

/**
 * 根据可见 code 集合过滤菜单树。
 * - 叶子节点：自身 code 在集合内即显示
 * - 父节点：任一子节点可见即显示（仅保留可见子节点）
 */
export function filterMenusByCodes(codes: Set<string>, nodes: MenuNode[] = MENU_TREE): MenuNode[] {
  const result: MenuNode[] = [];
  for (const n of nodes) {
    if (n.children?.length) {
      const kids = filterMenusByCodes(codes, n.children);
      if (kids.length) result.push({ ...n, children: kids });
    } else if (codes.has(n.code)) {
      result.push(n);
    }
  }
  return result;
}
