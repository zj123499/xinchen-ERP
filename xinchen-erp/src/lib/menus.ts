/**
 * 菜单单一数据源
 * 侧边栏渲染、角色菜单授权、按角色过滤均以此为准。
 * code 必须与数据库 menus.code 保持一致。
 */

export interface MenuNode {
  name: string;
  code: string;
  path?: string;
  icon: string;
  children?: MenuNode[];
}

export const MENU_TREE: MenuNode[] = [
  { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
  {
    name: "销售管理", code: "sales", icon: "leads",
    children: [
      { name: "线索管理", code: "leads", path: "/leads", icon: "leads" },
      { name: "跟进记录", code: "followup", path: "/followups", icon: "followup" },
      { name: "线索流转", code: "leadflow", path: "/lead-flow", icon: "leadFlow" },
      { name: "学生档案", code: "students", path: "/students", icon: "students" },
    ],
  },
  {
    name: "合同订单", code: "contracts", icon: "contracts",
    children: [
      { name: "合同管理", code: "contracts_list", path: "/contracts", icon: "contracts" },
      { name: "订单管理", code: "orders", path: "/orders", icon: "orders" },
    ],
  },
  {
    name: "交付管理", code: "delivery", icon: "applications",
    children: [
      { name: "申请管理", code: "applications", path: "/applications", icon: "applications" },
      { name: "文书工作台", code: "copywriter", path: "/copywriter", icon: "copywriter" },
      { name: "Offer管理", code: "offers", path: "/offers", icon: "offers" },
      { name: "签证管理", code: "visas", path: "/visas", icon: "visas" },
    ],
  },
  {
    name: "客户回访", code: "visits", icon: "visits",
    children: [
      { name: "回访记录", code: "visit_records", path: "/visit-records", icon: "visits" },
      { name: "回访计划", code: "visit_plans", path: "/visit-plans", icon: "visitPlan" },
    ],
  },
  {
    name: "财务管理", code: "finance", icon: "payments",
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
      { name: "配置版本", code: "config_versions", path: "/config-versions", icon: "settings" },
      { name: "薪资管理", code: "salaries", path: "/salaries", icon: "salaries" },
      { name: "报销管理", code: "reimbursements", path: "/reimbursements", icon: "reimbursements" },
      { name: "利润报表", code: "profit_reports", path: "/profit-reports", icon: "profit" },
    ],
  },
  {
    name: "扩展业务", code: "extended", icon: "rental",
    children: [
      { name: "租房管理", code: "rental", path: "/rental", icon: "rental" },
      { name: "境外服务", code: "overseas", path: "/overseas-services", icon: "overseas" },
      { name: "合作方", code: "partners", path: "/partners", icon: "partners" },
    ],
  },
  {
    name: "营销管理", code: "marketing", icon: "marketing",
    children: [
      { name: "站群管理", code: "sites", path: "/sites", icon: "sites" },
      { name: "新媒体账号", code: "media", path: "/media-accounts", icon: "media" },
      { name: "触点管理", code: "touchpoints", path: "/touchpoints", icon: "touchpoints" },
      { name: "归因结果", code: "attributions", path: "/attributions", icon: "attributions" },
      { name: "渠道ROI", code: "channel_roi", path: "/channel-roi", icon: "channelRoi" },
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
    name: "审批中心", code: "approval", icon: "approval",
    children: [
      { name: "审批流配置", code: "approval_flows", path: "/approval/flows", icon: "approval" },
      { name: "待我审批", code: "approval_pending", path: "/approval/records?scope=pending", icon: "approval" },
      { name: "我发起的", code: "approval_mine", path: "/approval/records?scope=mine", icon: "approval" },
    ],
  },
  {
    name: "客户成功", code: "success", icon: "success",
    children: [
      { name: "满意度调查", code: "surveys", path: "/success/surveys", icon: "success" },
      { name: "服务回访", code: "service_visits", path: "/success/visits", icon: "success" },
      { name: "投诉管理", code: "complaints", path: "/success/complaints", icon: "success" },
      { name: "转介绍", code: "referrals", path: "/success/referrals", icon: "success" },
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
    name: "AI 智能", code: "ai", icon: "ai",
    children: [
      { name: "AI 选校顾问", code: "ai_school", path: "/ai/school-select", icon: "ai" },
      { name: "AI 文书助手", code: "ai_writing", path: "/ai/writing", icon: "ai" },
      { name: "AI 客服助手", code: "ai_service", path: "/ai/customer-service", icon: "ai" },
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
