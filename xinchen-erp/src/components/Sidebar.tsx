"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap, Users, FileText, ClipboardCheck,
  Wallet, Receipt, BadgeDollarSign, Banknote, CreditCard, PieChart,
  LayoutDashboard, FileSignature, FileBadge,
  Settings, ChevronDown, ChevronRight,
  MessageSquare, Building2, Plane, Home, Globe, Share2, PhoneCall,
  UserCog, Radio, Globe2, CalendarClock, FileEdit,
  ArrowRightLeft, ShieldCheck, TrendingUp, Briefcase, KeyRound,
  Database, Wrench, BookOpen, GitBranch, HeartHandshake, AlertTriangle, Sparkles,
} from "lucide-react";
import { useState } from "react";

interface MenuItem {
  name: string;
  code: string;
  path?: string;
  icon: string;
  children?: MenuItem[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-5 h-5" />,
  leads: <Users className="w-5 h-5" />,
  students: <GraduationCap className="w-5 h-5" />,
  followup: <MessageSquare className="w-5 h-5" />,
  contracts: <FileText className="w-5 h-5" />,
  orders: <ClipboardCheck className="w-5 h-5" />,
  applications: <FileSignature className="w-5 h-5" />,
  offers: <FileBadge className="w-5 h-5" />,
  visas: <Plane className="w-5 h-5" />,
  payments: <Wallet className="w-5 h-5" />,
  costs: <Receipt className="w-5 h-5" />,
  commissions: <BadgeDollarSign className="w-5 h-5" />,
  salaries: <Banknote className="w-5 h-5" />,
  reimbursements: <CreditCard className="w-5 h-5" />,
  reports: <PieChart className="w-5 h-5" />,
  visits: <PhoneCall className="w-5 h-5" />,
  organization: <Building2 className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
  marketing: <Share2 className="w-5 h-5" />,
  rental: <Home className="w-5 h-5" />,
  partners: <Briefcase className="w-5 h-5" />,
  users: <UserCog className="w-5 h-5" />,
  share2: <Share2 className="w-5 h-5" />,
  sites: <Globe className="w-5 h-5" />,
  media: <Radio className="w-5 h-5" />,
  overseas: <Globe2 className="w-5 h-5" />,
  visitPlan: <CalendarClock className="w-5 h-5" />,
  copywriter: <FileEdit className="w-5 h-5" />,
  leadFlow: <ArrowRightLeft className="w-5 h-5" />,
  audit: <ShieldCheck className="w-5 h-5" />,
  profit: <TrendingUp className="w-5 h-5" />,
  roles: <KeyRound className="w-5 h-5" />,
  dicts: <Database className="w-5 h-5" />,
  configs: <Wrench className="w-5 h-5" />,
  dingtalk: <Share2 className="w-5 h-5" />,
  bi: <PieChart className="w-5 h-5" />,
  product: <BookOpen className="w-5 h-5" />,
  approval: <GitBranch className="w-5 h-5" />,
  success: <HeartHandshake className="w-5 h-5" />,
  risk: <AlertTriangle className="w-5 h-5" />,
  ai: <Sparkles className="w-5 h-5" />,
};

const MENUS: MenuItem[] = [
  { name: "工作台", code: "dashboard", path: "/", icon: "dashboard" },
  {
    name: "销售管理", code: "sales", icon: "leads",
    children: [
      { name: "线索管理", code: "leads", path: "/leads", icon: "leads" },
      { name: "线索流转", code: "leadflow", path: "/lead-flow", icon: "leadFlow" },
      { name: "学生档案", code: "students", path: "/students", icon: "students" },
      { name: "跟进记录", code: "followup", path: "/followups", icon: "followup" },
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
      { name: "成本管理", code: "costs", path: "/costs", icon: "costs" },
      { name: "提成管理", code: "commissions", path: "/commissions", icon: "commissions" },
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
    name: "经营驾驶舱", code: "bi", icon: "bi", path: "/bi",
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

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["sales", "contracts", "delivery", "finance", "product", "approval", "success", "risk", "ai"]));

  function toggleExpand(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function renderItem(item: MenuItem) {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expanded.has(item.code);
    const isActive = item.path === pathname;

    if (hasChildren) {
      return (
        <div key={item.code}>
          <button onClick={() => toggleExpand(item.code)}
            className="w-full flex items-center px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition rounded-lg">
            <span className="mr-3">{ICON_MAP[item.icon]}</span>
            <span className="flex-1 text-left">{item.name}</span>
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children!.map((child) => renderItem(child))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link key={item.code} href={item.path || "#"}
        className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
        <span className="mr-3">{ICON_MAP[item.icon]}</span>
        {item.name}
      </Link>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-gray-900 flex flex-col z-30">
      <div className="h-14 flex items-center px-5 border-b border-gray-800">
        <GraduationCap className="w-6 h-6 text-blue-500 mr-2" />
        <span className="text-white font-bold text-lg">新辰ERP</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {MENUS.map((item) => renderItem(item))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">新辰留学 v1.0.0</div>
      </div>
    </aside>
  );
}
