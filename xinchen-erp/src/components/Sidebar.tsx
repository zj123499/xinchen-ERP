"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap, Users, FileText, ClipboardCheck,
  Wallet, Receipt, BadgeDollarSign, Banknote, CreditCard, PieChart,
  LayoutDashboard, FileSignature, FileBadge,
  TrendingUp as TrendUp, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle, RotateCcw,
  Settings, ChevronDown, ChevronRight,
  MessageSquare, Building2, Plane, Home, Globe, Share2, PhoneCall,
  UserCog, Radio, Globe2, CalendarClock, FileEdit, BarChart3, Filter,
  ArrowRightLeft, ShieldCheck, TrendingUp, Briefcase, KeyRound,
  Database, Wrench, BookOpen, GitBranch, HeartHandshake, AlertTriangle, Sparkles,
  Monitor,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MENU_TREE, filterMenusByCodes, type MenuNode } from "@/lib/menus";

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
  incomes: <ArrowUpCircle className="w-5 h-5" />,
  receivables: <TrendUp className="w-5 h-5" />,
  payables: <ArrowDownCircle className="w-5 h-5" />,
  invoices: <FileSpreadsheet className="w-5 h-5" />,
  refunds: <RotateCcw className="w-5 h-5" />,
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
  touchpoints: <Radio className="w-5 h-5" />,
  attributions: <Filter className="w-5 h-5" />,
  channelRoi: <BarChart3 className="w-5 h-5" />,
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
  screen: <Monitor className="w-5 h-5" />,
};

export default function Sidebar() {
  const pathname = usePathname();
  // 登录后默认所有菜单为未展开状态
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // 可见菜单：null 表示尚未加载完成（避免闪烁）
  const [menus, setMenus] = useState<MenuNode[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/menus")
      .then((r) => (r.ok ? r.json() : { isAdmin: true, codes: [] }))
      .then((data) => {
        if (!alive) return;
        if (data?.isAdmin) {
          setMenus(MENU_TREE);
        } else {
          const codes = new Set<string>(Array.isArray(data?.codes) ? data.codes : []);
          setMenus(filterMenusByCodes(codes));
        }
      })
      .catch(() => {
        if (alive) setMenus(MENU_TREE);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 导航到子页面时，自动展开其所属顶级菜单（登录初始仍为折叠）
  useEffect(() => {
    const top = (menus ?? []).find(
      (m) => m.children?.some((c) => c.path === pathname)
    );
    if (top && !expanded.has(top.code)) {
      setExpanded((prev) => new Set(prev).add(top.code));
    }
  }, [pathname, menus]);

  function toggleExpand(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function renderItem(item: MenuNode) {
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
        {(menus ?? []).map((item) => renderItem(item))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">新辰留学 v1.0.0</div>
      </div>
    </aside>
  );
}
