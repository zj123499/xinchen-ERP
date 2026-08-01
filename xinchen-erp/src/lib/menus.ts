/**
 * 全局菜单树 + 角色-部门映射 + 权限映射
 *
 * - 同一功能表单不按部门重复挂载，升为共享一级菜单
 * - 菜单可见性 100% 由 admin 在「角色权限→菜单配置」中设置
 */

export interface MenuNode {
  name: string;
  code: string;
  path?: string;
  icon: string;
  children?: MenuNode[];
}

// ============================================
// 角色 → 部门映射（仅用于 WorkRecord）
// ============================================
export const ROLE_DEPARTMENT_MAP: Record<string, { dept: string; isManagement: boolean; isDeptLead: boolean }> = {
  admin:                 { dept: "管理", isManagement: true, isDeptLead: true },
  general_manager:       { dept: "管理", isManagement: true, isDeptLead: true },
  operations_director:   { dept: "管理", isManagement: true, isDeptLead: true },
  // 新媒体部：组长看全部，专员看自己
  newmedia_manager:      { dept: "新媒体部", isManagement: false, isDeptLead: true },
  newmedia_operator:     { dept: "新媒体部", isManagement: false, isDeptLead: false },
  // 市场部
  marketing_specialist:  { dept: "市场部", isManagement: false, isDeptLead: true },
  // 网络部：网络运营是组长，直播看自己
  network_operator:      { dept: "网络部", isManagement: false, isDeptLead: true },
  live_streamer:         { dept: "网络部", isManagement: false, isDeptLead: false },
  // 咨询部/文书部/财务部（当前各只有一个角色，默认组长）
  academic_advisor:      { dept: "咨询部", isManagement: false, isDeptLead: true },
  document_application:  { dept: "文书部", isManagement: false, isDeptLead: true },
  finance:               { dept: "财务部", isManagement: false, isDeptLead: true },
};

// ============================================
// 全量菜单树
// ============================================
export const MENU_TREE: MenuNode[] = [
  { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },

  // === 共享一级：线索录入 ===
  { name: "线索录入", code: "leads", path: "/leads", icon: "leads" },

  // === 共享一级：客户管理 ===
  {
    name: "客户管理", code: "customer_mgmt", icon: "customer",
    children: [
      { name: "待跟进", code: "followup_pending", path: "/followups/pending", icon: "followup" },
      { name: "意向客户", code: "followup_interested", path: "/followups/interested", icon: "followup" },
      { name: "已签约客户", code: "followup_signed", path: "/followups/signed", icon: "followup" },
      { name: "无意向客户", code: "followup_uninterested", path: "/followups/uninterested", icon: "followup" },
    ],
  },

  // === 共享一级：线索管理（原客户管理） ===
  {
    name: "线索管理", code: "lead_mgmt", icon: "leadFlow",
    children: [
      { name: "线索流转", code: "leadflow", path: "/lead-flow", icon: "leadFlow" },
      { name: "回访记录", code: "visit_records", path: "/visit-records", icon: "visits" },
      { name: "回访计划", code: "visit_plans", path: "/visit-plans", icon: "visitPlan" },
      { name: "触点管理", code: "touchpoints", path: "/touchpoints", icon: "touchpoints" },
      { name: "归因结果", code: "attributions", path: "/attributions", icon: "attributions" },
    ],
  },

  // === 部门专属：新媒体部 ===
  {
    name: "新媒体部", code: "dept_newmedia", icon: "media",
    children: [
      { name: "新媒体账号", code: "media", path: "/media-accounts", icon: "media" },
    ],
  },

  // === 部门专属：网络部 ===
  {
    name: "网络部", code: "dept_network", icon: "sites",
    children: [
      { name: "站群管理", code: "sites_mgmt", icon: "sites", children: [
        { name: "站点列表", code: "sites", path: "/sites", icon: "sites" },
        { name: "公司模版", code: "company_templates", path: "/company-templates", icon: "template" },
        { name: "服务器", code: "servers", path: "/servers", icon: "server" },
      ]},
    ],
  },

  // === 部门专属：文书部 ===
  {
    name: "文书部", code: "dept_document", icon: "applications",
    children: [
      { name: "学生档案", code: "students", path: "/students", icon: "students" },
      { name: "申请管理", code: "applications", path: "/applications", icon: "applications" },
      { name: "签证管理", code: "visas", path: "/visas", icon: "visas" },
    ],
  },

  // === 部门专属：财务部 ===
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
      { name: "渠道ROI", code: "channel_roi", path: "/channel-roi", icon: "channelRoi" },
      { name: "利润报表", code: "profit_reports", path: "/profit-reports", icon: "profit" },
    ],
  },

  // === 共享一级 ===
  { name: "合同管理", code: "contracts", path: "/contracts", icon: "contracts" },
  {
    name: "合作方管理", code: "partners_mgmt", icon: "partners",
    children: [
      { name: "合作院校", code: "partner_schools", path: "/partner-schools", icon: "partners" },
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
  { name: "数据大屏", code: "bi_screen", path: "/bi/screen", icon: "screen" },
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
// 访问范围：管理员/组长 → all，普通成员 → self
// ============================================
export function getAccessScope(roles: string[], userId: number): { scope: "all" | "self"; userId: number } {
  for (const role of roles) {
    const info = ROLE_DEPARTMENT_MAP[role];
    if (info?.isManagement || info?.isDeptLead) return { scope: "all", userId };
  }
  return { scope: "self", userId };
}

// ============================================
// 菜单 → 权限映射
// ============================================
export const MENU_PERMISSION_MAP: Record<string, string[]> = {
  dashboard: ["dashboard:leads", "dashboard:contracts", "dashboard:finance", "dashboard:students", "dashboard:applications", "dashboard:visits"],
  // 线索录入
  leads:              ["leads:view", "leads:create", "leads:update", "leads:delete", "leads:export", "leads:assign"],
  // 客户管理
  followup_pending:   ["leads:view", "leads:update"],
  followup_interested:["leads:view", "leads:update"],
  followup_signed:    ["leads:view", "contracts:view"],
  followup_uninterested: ["leads:view", "leads:update"],
  // 线索管理
  leadflow:           ["leadflow:view"],
  visit_records:      ["visits:view", "visits:create", "visits:update", "visits:delete"],
  visit_plans:        ["visit_plans:view", "visit_plans:create", "visit_plans:update", "visit_plans:delete"],
  touchpoints:        ["touchpoints:view", "touchpoints:create", "touchpoints:update", "touchpoints:delete"],
  attributions:       ["leads:view"],
  // 新媒体部
  media:              ["media:view", "media:create", "media:update", "media:delete"],
  // 网络部
  sites:              ["sites:view", "sites:create", "sites:update", "sites:delete"],
  company_templates:  ["company_templates:view", "company_templates:create", "company_templates:update", "company_templates:delete"],
  servers:            ["servers:view", "servers:create", "servers:update", "servers:delete"],
  // 文书部
  students:           ["students:view", "students:create", "students:update", "students:delete"],
  applications:       ["applications:view", "applications:create", "applications:update"],
  visas:              ["applications:view", "applications:update"],
  // 合作方
  partner_schools:    ["partners:view", "partners:manage"],
  partners:           ["partners:view", "partners:manage"],
  // 财务部
  payments:           ["payments:view", "payments:create", "payments:export"],
  incomes:            ["payments:view"],
  receivables:        ["payments:view"],
  payables:           ["payments:view"],
  invoices:           ["payments:view"],
  refunds:            ["payments:view"],
  costs:              ["payments:view"],
  commissions:        ["payments:view"],
  commission_rules:   ["settings:manage"],
  salaries:           ["payments:view"],
  reimbursements:     ["payments:view"],
  channel_roi:        ["reports:view"],
  profit_reports:     ["reports:view"],
  // 合同
  contracts:          ["contracts:view", "contracts:create", "contracts:update", "contracts:approve"],
  // 扩展
  rental:             ["rental:view", "rental:manage"],
  overseas:           ["overseas:view", "overseas:manage"],
  // 产品
  countries:          ["countries:view", "countries:create", "countries:update", "countries:delete"],
  institutions:       ["institutions:view", "institutions:create", "institutions:update", "institutions:delete"],
  majors:             ["majors:view", "majors:create", "majors:update", "majors:delete"],
  products:           ["products:view", "products:create", "products:update", "products:delete"],
  product_packages:   ["product_packages:view", "product_packages:create", "product_packages:update", "product_packages:delete"],
  // 风险
  risk_dashboard:     ["risk:view"],
  risk_rules:         ["risk:view", "risk:manage"],
  // 数据大屏
  bi_screen:          ["reports:view"],
  // 系统
  settings:           ["settings:manage"],
  employees:          ["settings:manage"],
  organization:       ["settings:manage"],
  roles:              ["settings:manage"],
  dingtalk:           ["settings:manage"],
  dicts:              ["settings:manage"],
  configs:            ["settings:manage"],
  audit:              ["settings:manage"],
  "operation-logs":   ["settings:manage"],
  "login-logs":       ["settings:manage"],
};

// ============================================
// 菜单树过滤与排序
// ============================================
export function filterMenusByCodes(codes: string[], nodes: MenuNode[] = MENU_TREE): MenuNode[] {
  const codeOrder = new Map<string, number>();
  codes.forEach((c, i) => codeOrder.set(c, i));

  function filterAndSort(items: MenuNode[]): MenuNode[] {
    const result: MenuNode[] = [];
    for (const n of items) {
      if (n.children?.length) {
        const kids = filterAndSort(n.children);
        if (kids.length) result.push({ ...n, children: kids });
      } else if (codeOrder.has(n.code)) {
        result.push(n);
      }
    }
    result.sort((a, b) => {
      const aIdx = codeOrder.get(a.code) ?? 9999;
      const bIdx = codeOrder.get(b.code) ?? 9999;
      return aIdx - bIdx;
    });
    return result;
  }
  return filterAndSort(nodes);
}
