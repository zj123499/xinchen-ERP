/**
 * 全局菜单树 + 角色-部门映射
 *
 * - MENU_TREE: 全量菜单（与部门架构.docx 完全一致）
 * - ROLE_DEPARTMENT_MAP: 角色→部门（用于 WorkRecord 归属，不影响菜单可见性）
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
// 角色 → 部门映射（仅用于业绩记录 WorkRecord）
// ============================================
export const ROLE_DEPARTMENT_MAP: Record<string, { dept: string; isManagement: boolean }> = {
  admin:                 { dept: "管理", isManagement: true },
  general_manager:       { dept: "管理", isManagement: true },
  operations_director:   { dept: "管理", isManagement: true },
  newmedia_manager:      { dept: "新媒体部", isManagement: false },
  newmedia_operator:     { dept: "新媒体部", isManagement: false },
  marketing_specialist:  { dept: "市场部", isManagement: false },
  network_operator:      { dept: "网络部", isManagement: false },
  live_streamer:         { dept: "网络部", isManagement: false },
  academic_advisor:      { dept: "咨询部", isManagement: false },
  document_application:  { dept: "文书部", isManagement: false },
  finance:               { dept: "财务部", isManagement: false },
};

// ============================================
// 全量菜单树（与 部门架构.docx 一致）
// ============================================
export const MENU_TREE: MenuNode[] = [
  { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },

  // === 新媒体部 ===
  {
    name: "新媒体部", code: "dept_newmedia", icon: "media",
    children: [
      { name: "线索管理", code: "leads_newmedia", path: "/leads", icon: "leads" },
      { name: "新媒体账号", code: "media", path: "/media-accounts", icon: "media" },
    ],
  },

  // === 市场部 ===
  {
    name: "市场部", code: "dept_marketing", icon: "marketing",
    children: [
      { name: "线索管理", code: "leads_marketing", path: "/leads", icon: "leads" },
      { name: "待跟进", code: "followup_pending", path: "/followups/pending", icon: "followup" },
      { name: "意向客户", code: "followup_interested", path: "/followups/interested", icon: "followup" },
      { name: "已签约客户", code: "followup_signed", path: "/followups/signed", icon: "followup" },
      { name: "无意向客户", code: "followup_uninterested", path: "/followups/uninterested", icon: "followup" },
    ],
  },

  // === 网络部 ===
  {
    name: "网络部", code: "dept_network", icon: "sites",
    children: [
      { name: "线索管理", code: "leads_network", path: "/leads", icon: "leads" },
      { name: "站群管理", code: "sites_mgmt", icon: "sites", children: [
        { name: "站点列表", code: "sites", path: "/sites", icon: "sites" },
        { name: "公司模版", code: "company_templates", path: "/company-templates", icon: "template" },
        { name: "服务器", code: "servers", path: "/servers", icon: "server" },
      ]},
    ],
  },

  // === 咨询部 ===
  {
    name: "咨询部", code: "dept_consulting", icon: "leads",
    children: [
      { name: "线索管理", code: "leads_consulting", path: "/leads", icon: "leads" },
      { name: "待跟进", code: "consulting_pending", path: "/followups/pending", icon: "followup" },
      { name: "意向客户", code: "consulting_interested", path: "/followups/interested", icon: "followup" },
      { name: "已签约客户", code: "consulting_signed", path: "/followups/signed", icon: "followup" },
      { name: "无意向客户", code: "consulting_uninterested", path: "/followups/uninterested", icon: "followup" },
    ],
  },

  // === 客户管理（独立一级菜单） ===
  {
    name: "客户管理", code: "customer_mgmt", icon: "customer",
    children: [
      { name: "线索流转", code: "leadflow", path: "/lead-flow", icon: "leadFlow" },
      { name: "回访记录", code: "visit_records", path: "/visit-records", icon: "visits" },
      { name: "回访计划", code: "visit_plans", path: "/visit-plans", icon: "visitPlan" },
      { name: "触点管理", code: "touchpoints", path: "/touchpoints", icon: "touchpoints" },
      { name: "归因结果", code: "attributions", path: "/attributions", icon: "attributions" },
    ],
  },

  // === 文书部 ===
  {
    name: "文书部", code: "dept_document", icon: "applications",
    children: [
      { name: "学生档案", code: "students", path: "/students", icon: "students" },
      { name: "申请管理", code: "applications", path: "/applications", icon: "applications" },
      { name: "签证管理", code: "visas", path: "/visas", icon: "visas" },
    ],
  },

  // === 合作方管理 ===
  {
    name: "合作方管理", code: "partners_mgmt", icon: "partners",
    children: [
      { name: "合作院校", code: "partner_schools", path: "/partner-schools", icon: "partners" },
      { name: "合作方", code: "partners", path: "/partners", icon: "partners" },
    ],
  },

  // === 财务部 ===
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

  // === 合同管理 ===
  { name: "合同管理", code: "contracts", path: "/contracts", icon: "contracts" },

  // === 扩展业务 ===
  {
    name: "扩展业务", code: "extended", icon: "rental",
    children: [
      { name: "租房管理", code: "rental", path: "/rental", icon: "rental" },
      { name: "境外服务", code: "overseas", path: "/overseas-services", icon: "overseas" },
    ],
  },

  // === 产品资源 ===
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

  // === 风险管理 ===
  {
    name: "风险管理", code: "risk", icon: "risk",
    children: [
      { name: "风险看板", code: "risk_dashboard", path: "/risk/dashboard", icon: "risk" },
      { name: "风险规则", code: "risk_rules", path: "/risk/rules", icon: "risk" },
    ],
  },

  // === 数据大屏 ===
  { name: "数据大屏", code: "bi_screen", path: "/bi/screen", icon: "screen" },

  // === 系统设置 ===
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

/**
 * 根据可见 code 数组过滤并排序菜单树。
 * codes 的顺序即排序依据（位置越小越靠前）。
 */
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
    // 按 code 在 codes 数组中的位置排序
    result.sort((a, b) => {
      const aIdx = codeOrder.get(a.code) ?? 9999;
      const bIdx = codeOrder.get(b.code) ?? 9999;
      return aIdx - bIdx;
    });
    return result;
  }
  return filterAndSort(nodes);
}
