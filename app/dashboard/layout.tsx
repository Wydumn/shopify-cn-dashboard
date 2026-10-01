"use client";

import { createContext, useContext, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Brain,
  Coins,
  Shield,
  BarChart3,
  Layers,
  Landmark,
  RefreshCw,
  TrendingUp,
  ChevronDown,
  Package,
  DollarSign,
  AlertTriangle,
  Repeat,
  Zap,
  ShoppingBag,
  ShoppingCart,
  Store,
  Target,
  Users,
  Truck,
  FolderTree,
  Menu,
  FileText,
  Database,
  CalendarClock,
  History,
  Gauge,
  Workflow,
  Globe,
  Languages,
  Receipt,
  BarChart4,
  PieChart,
  Link,
  Braces,
  Bot,
  Code2,
  Wand,
  GitCompare,
  GitBranch,
  Sparkles,
  Compass,
  Search,
  Key,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { findGroup, PANEL_GROUPS } from "./nav-groups";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { saveDefaultDemoStore } from "./demo-store";

// ─── Context ───────────────────────────────────────────

export type MenuKey = "overview" | "ai" | "ai-assistant" | "finance" | "risk" | "trend" | "aggregator" | "gateway" | "funnel" | "ad" | "product-control" | "bulk-edit" | "batch-op" | "scheduled-tasks" | "rule-engine" | "orders" | "customers" | "fulfillment" | "collections" | "navigation" | "content-pages" | "metafields" | "operation-history" | "inventory-alert" | "markets" | "multi-currency" | "multi-location" | "translations" | "shipping-rates" | "tax-overview" | "product-analytics" | "category-analytics" | "customer-segmentation" | "sales-forecast" | "product-affinity" | "schema-audit" | "schema-generator" | "ai-indexability" | "competitor-geo" | "ai-simulation" | "geo-wizard" | "seo-health" | "search-console" | "keyword-research" | "analytics" | "landing-page" | "product-conversion" | "ab-testing";

interface DashboardContextValue {
  activeMenu: MenuKey;
  setActiveMenu: (key: MenuKey) => void;
}

const DashboardContext = createContext<DashboardContextValue>({
  activeMenu: "overview",
  setActiveMenu: () => {},
});

export function useDashboardMenu() {
  return useContext(DashboardContext);
}

// ─── Category Definition ───────────────────────────────

interface NavCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  items: Array<{
    id: MenuKey;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    soon?: boolean;
  }>;
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    id: "data-center",
    label: "数据中心",
    icon: BarChart3,
    items: [
      { id: "aggregator", label: "全店聚合大盘", icon: Layers },
      { id: "trend", label: "趋势同比分析", icon: BarChart3 },
      { id: "funnel", label: "漏斗转化复购", icon: Repeat },
    ],
  },
  {
    id: "order-customer",
    label: "订单与客户",
    icon: ShoppingBag,
    items: [
      { id: "orders", label: "订单管理中心", icon: ShoppingBag },
      { id: "customers", label: "客户中心", icon: Users },
      { id: "fulfillment", label: "履约看板", icon: Truck },
      { id: "inventory-alert", label: "库存中心", icon: Gauge },
    ],
  },
  {
    id: "product-content",
    label: "商品与内容",
    icon: Package,
    items: [
      { id: "product-control", label: "价格与批量", icon: Zap },
      { id: "scheduled-tasks", label: "定时任务", icon: CalendarClock },
      { id: "rule-engine", label: "规则引擎", icon: Workflow },
      { id: "collections", label: "集合管理", icon: FolderTree },
      { id: "navigation", label: "导航菜单编辑", icon: Menu },
      { id: "content-pages", label: "页面与博客", icon: FileText },
      { id: "metafields", label: "Metafields 编辑器", icon: Database },
      { id: "operation-history", label: "操作历史", icon: History },
    ],
  },
  {
    id: "geo-center",
    label: "GEO 优化",
    icon: Braces,
    items: [
      { id: "geo-wizard", label: "GEO 优化向导", icon: Compass },
      { id: "ai-indexability", label: "AI 可索引性检查", icon: Bot },
      { id: "schema-audit", label: "Schema 检测", icon: Code2 },
      { id: "schema-generator", label: "Schema 自动生成", icon: Wand },
      { id: "competitor-geo", label: "竞品 GEO 对标", icon: GitCompare },
      { id: "ai-simulation", label: "AI 引用模拟器", icon: Sparkles },
    ],
  },
  {
    id: "seo-center",
    label: "SEO 优化",
    icon: Search,
    items: [
      { id: "seo-health", label: "SEO 健康扫描", icon: Search },
      { id: "search-console", label: "Search Console", icon: BarChart4 },
      { id: "keyword-research", label: "关键词研究", icon: Key },
      { id: "analytics", label: "流量分析", icon: TrendingUp },
    ],
  },
  {
    id: "finance-center",
    label: "财务对账",
    icon: DollarSign,
    items: [
      { id: "ad", label: "广告成效与 MER", icon: TrendingUp },
      { id: "gateway", label: "网关渠道对账", icon: Landmark },
      { id: "finance", label: "供应链对账", icon: Coins },
    ],
  },
  {
    id: "markets-center",
    label: "多市场运营",
    icon: Globe,
    items: [
      { id: "markets", label: "市场总览", icon: Globe },
      { id: "translations", label: "翻译管理器", icon: Languages },
      { id: "shipping-rates", label: "运费管理", icon: Truck },
      { id: "tax-overview", label: "税务总览", icon: Receipt },
    ],
  },
  {
    id: "risk-center",
    label: "风控预警",
    icon: Shield,
    items: [
      { id: "ai", label: "AI 智能诊断", icon: Brain },
      { id: "risk", label: "账户风控雷达", icon: AlertTriangle },
    ],
  },
  {
    id: "intelligence-center",
    label: "智能决策",
    icon: BarChart4,
    items: [
      { id: "product-analytics", label: "商品深度分析", icon: BarChart4 },
      { id: "category-analytics", label: "品类分析", icon: PieChart },
      { id: "sales-forecast", label: "销售预测", icon: TrendingUp },
      { id: "product-affinity", label: "商品关联分析", icon: Link },
      { id: "landing-page", label: "着陆页分析", icon: Target },
      { id: "product-conversion", label: "商品转化分析", icon: ShoppingCart },
      { id: "ab-testing", label: "A/B 测试", icon: GitBranch },
      { id: "ai-assistant", label: "AI 运营助手", icon: MessageSquare },
    ],
  },
];

// ─── Layout Component ──────────────────────────────────

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const queryMenu = searchParams.get("panel");
  const isValidMenu = (value: string | null): value is MenuKey =>
    value === "overview" ||
    NAV_CATEGORIES.some((category) => category.items.some((item) => item.id === value)) ||
    PANEL_GROUPS.some((group) => group.tabs.some((tab) => tab.id === value));
  const [localActiveMenu, setLocalActiveMenu] = useState<MenuKey | null>(null);
  const activeMenu = localActiveMenu ?? (isValidMenu(queryMenu) ? queryMenu : "overview");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const initial = isValidMenu(queryMenu) ? queryMenu : "overview";
    const anchor = NAV_CATEGORIES.some((c) => c.items.some((i) => i.id === initial))
      ? initial
      : (findGroup(initial)?.tabs[0].id ?? initial);
    const category = NAV_CATEGORIES.find((item) => item.items.some((navItem) => navItem.id === anchor));
    return new Set(category ? [category.id] : []);
  });
  const [soonMsg, setSoonMsg] = useState<string | null>(null);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("sidebar-collapsed") === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebar-collapsed", next ? "1" : "0"); } catch {}
  };

  const setActiveMenu = (menu: MenuKey) => {
    setLocalActiveMenu(menu);
    const nextParams = new URLSearchParams(window.location.search);
    if (menu === "overview") nextParams.delete("panel");
    else nextParams.set("panel", menu);
    const query = nextParams.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const wasExpanded = prev.has(id);
      // 如果该分类已展开 → 收缩（什么都不做就是删除）
      if (wasExpanded) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      // 如果该分类未展开 → 只展开这一个，其余全部收缩（手风琴模式）
      const next = new Set<string>();
      next.add(id);
      // GEO 分类默认入口：展开时若当前不在该分类内，跳转到向导面板
      if (id === "geo-center" && !NAV_CATEGORIES.find((c) => c.id === "geo-center")?.items.some((i) => i.id === activeMenu)) {
        const first = NAV_CATEGORIES.find((c) => c.id === "geo-center")?.items[0];
        if (first) setActiveMenu(first.id as MenuKey);
      }
      return next;
    });
  };

  const handleMenuClick = (id: MenuKey, soon?: boolean) => {
    if (soon) {
      setSoonMsg("[Roadmap No.1] 广告成效与实时 MER 面板正在全力研发中，预计 4 号开源发布后 48 小时内随 MVP 2.1 补丁合入！");
      setTimeout(() => setSoonMsg(null), 4000);
      return;
    }
    setActiveMenu(id);
    const activeCategory = NAV_CATEGORIES.find((category) => category.items.some((item) => item.id === id));
    if (activeCategory) setExpandedCategories(new Set([activeCategory.id]));
    setMobileNavigationOpen(false);
  };

  const revealCategory = (id: string) => {
    setCollapsed(false);
    try { localStorage.setItem("sidebar-collapsed", "0"); } catch {}
    setExpandedCategories(new Set([id]));
    if (id === "geo-center" && !NAV_CATEGORIES.find((c) => c.id === "geo-center")?.items.some((i) => i.id === activeMenu)) {
      const first = NAV_CATEGORIES.find((c) => c.id === "geo-center")?.items[0];
      if (first) setActiveMenu(first.id as MenuKey);
    }
  };

  return (
    <DashboardContext.Provider value={{ activeMenu, setActiveMenu }}>
      <div className="min-h-screen bg-background">
        {/* ── Sidebar ── */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex",
            collapsed ? "w-16" : "w-64",
          )}
        >
          {/* Logo */}
          <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border", collapsed ? "justify-center px-2" : "px-5")}>
            <div className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Store className="h-4 w-4 text-sidebar-primary" strokeWidth={1.5} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">
                  Shopify CN Pro
                </p>
                <p className="truncate text-xs font-medium text-sidebar-muted-foreground">
                  v0.3.2.1 · MVP 3.2.1
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
            {/* ── Top-level: Overview ── */}
            <button
              type="button"
              onClick={() => handleMenuClick("overview")}
              aria-current={activeMenu === "overview" ? "page" : undefined}
              aria-label="核心实时看板"
              title={collapsed ? "核心实时看板" : undefined}
              className={cn(
                "relative flex h-9 w-full items-center rounded-md font-medium transition-colors",
                collapsed ? "justify-center px-0" : "gap-3 px-3 text-[13px]",
                activeMenu === "overview"
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              {activeMenu === "overview" && (
                <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
              )}
              <LayoutDashboard className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="flex-1 text-left">核心实时看板</span>}
            </button>

            {/* ── Divider ── */}
            <hr className="my-4 border-sidebar-border" />

            {/* ── Category groups ── */}
            {collapsed ? (
              <div className="mt-1 flex flex-col items-center gap-1">
                {NAV_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const hasActiveChild = cat.items.some((i) => activeMenu === i.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-label={cat.label}
                      title={cat.label}
                      onClick={() => revealCategory(cat.id)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                        hasActiveChild
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <CatIcon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            ) : (
            <div className="space-y-3">
              {NAV_CATEGORIES.map((cat) => {
                const isExpanded = expandedCategories.has(cat.id);
                const hasActiveChild = cat.items.some((i) => activeMenu === i.id);

                return (
                  <div key={cat.id}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 pb-1.5 pt-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors",
                        hasActiveChild
                          ? "text-sidebar-foreground"
                          : "text-sidebar-muted-foreground hover:text-sidebar-foreground",
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={`dashboard-nav-${cat.id}`}
                    >
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 shrink-0 transition-transform",
                          isExpanded ? "" : "-rotate-90",
                        )}
                      />
                      <span className="flex-1">{cat.label}</span>
                    </button>

                    {/* Sub-items */}
                    <div
                      id={`dashboard-nav-${cat.id}`}
                      inert={!isExpanded}
                      className={cn(
                        "grid transition-all duration-300 ease-in-out",
                        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <ul className="mt-1 space-y-0.5 pl-1">
                          {cat.items.map((item) => {
                            const group = findGroup(item.id);
                            const isActive = activeMenu === item.id || (!!group && group.tabs.some((t) => t.id === activeMenu));
                            const Icon = item.icon;

                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => handleMenuClick(item.id, item.soon)}
                                  aria-current={isActive ? "page" : undefined}
                                  className={cn(
                                    "relative flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-[13px] font-medium transition-colors",
                                    item.soon
                                      ? "text-sidebar-muted-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                      : isActive
                                        ? "bg-sidebar-accent text-sidebar-foreground"
                                        : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                                  )}
                                >
                                  {isActive && (
                                    <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
                                  )}
                                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                                  <span className="flex-1 text-left">
                                    {item.label}
                                  </span>
                                  {item.soon && (
                                    <span className="text-[11px] font-semibold text-warning">
                                      即将开放
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </nav>

          {/* Footer */}
          <div className={cn("border-t border-sidebar-border", collapsed ? "px-2 py-4" : "px-3 py-4")}>
            {/* Roadmap toast */}
            {soonMsg && !collapsed && (
              <div className="mb-3 rounded-lg border border-warning-border bg-warning-bg px-3 py-2">
                <p className="text-[11px] leading-relaxed text-warning">{soonMsg}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                saveDefaultDemoStore();
                window.location.href = "/dashboard";
              }}
              aria-label="重置演示数据"
              title={collapsed ? "重置演示数据" : undefined}
              className={cn(
                "flex h-9 w-full items-center rounded-md font-medium text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed ? "justify-center px-0" : "gap-3 px-3 text-[13px]",
              )}
            >
              <RefreshCw className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span>重置演示数据</span>}
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
              title={collapsed ? "展开侧栏" : "收起侧栏"}
              className={cn(
                "mt-1 flex h-9 w-full items-center rounded-md font-medium text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed ? "justify-center px-0" : "gap-3 px-3 text-[13px]",
              )}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" strokeWidth={1.5} /> : <PanelLeftClose className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
              {!collapsed && <span>收起侧栏</span>}
            </button>
          </div>
        </aside>

        <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
          <SheetContent
            id="mobile-dashboard-navigation"
            side="left"
            showCloseButton={false}
            className="data-[side=left]:w-72 max-w-[calc(100vw-2rem)] gap-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-[calc(100vw-2rem)]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>导航菜单</SheetTitle>
              <SheetDescription>选择要打开的 Shopify dashboard 模块。</SheetDescription>
            </SheetHeader>
            <div className="flex h-full min-h-0 flex-col">
              <div className="relative flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
                <div className="flex h-9 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Store className="h-4 w-4 text-sidebar-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold tracking-tight text-sidebar-foreground">Shopify CN Pro</p>
                  <p className="text-xs font-medium text-sidebar-muted-foreground">v0.3.2.1 · MVP 3.2.1</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="关闭导航"
                  className="absolute right-3 top-3 size-10"
                  onClick={() => setMobileNavigationOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <nav aria-label="Dashboard 模块" className="flex-1 overflow-y-auto px-3 py-4">
                <button
                  type="button"
                  onClick={() => handleMenuClick("overview")}
                  aria-current={activeMenu === "overview" ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium transition-colors",
                    activeMenu === "overview"
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  {activeMenu === "overview" && (
                    <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
                  )}
                  <LayoutDashboard className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  核心实时看板
                </button>
                <hr className="my-4 border-sidebar-border" />
                <div className="space-y-3">
                  {NAV_CATEGORIES.map((cat) => {
                    const isExpanded = expandedCategories.has(cat.id);
                    const hasActiveChild = cat.items.some((item) => activeMenu === item.id);

                    return (
                      <section key={cat.id}>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`mobile-dashboard-nav-${cat.id}`}
                          onClick={() => toggleCategory(cat.id)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 pb-1.5 pt-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors",
                            hasActiveChild
                              ? "text-sidebar-foreground"
                              : "text-sidebar-muted-foreground hover:text-sidebar-foreground",
                          )}
                        >
                          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isExpanded ? "" : "-rotate-90")} />
                          <span className="flex-1">{cat.label}</span>
                        </button>
                        <ul id={`mobile-dashboard-nav-${cat.id}`} hidden={!isExpanded} className="mt-1 space-y-0.5 pl-1">
                          {cat.items.map((item) => {
                            const Icon = item.icon;
                            const group = findGroup(item.id);
                            const isActive = activeMenu === item.id || (!!group && group.tabs.some((t) => t.id === activeMenu));

                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => handleMenuClick(item.id, item.soon)}
                                  aria-current={isActive ? "page" : undefined}
                                  className={cn(
                                    "relative flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-left text-[13px] font-medium transition-colors",
                                    item.soon
                                      ? "text-sidebar-muted-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                                      : isActive
                                        ? "bg-sidebar-accent text-sidebar-foreground"
                                        : "text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                                  )}
                                >
                                  {isActive && (
                                    <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
                                  )}
                                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                                  <span className="flex-1">{item.label}</span>
                                  {item.soon && <span className="text-[11px] font-semibold text-warning">即将开放</span>}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </nav>
              <div className="border-t border-sidebar-border px-3 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavigationOpen(false);
                    saveDefaultDemoStore();
                    window.location.href = "/dashboard";
                  }}
                  className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <RefreshCw className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  重置演示数据
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Main Content ── */}
        <main
          className={cn(
            "min-h-screen bg-background p-4 pb-8 transition-[margin] duration-200 ease-out sm:p-6",
            collapsed ? "lg:ml-16" : "lg:ml-64",
          )}
        >
          <div className="mb-5 flex items-center justify-between border-b border-border pb-4 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Store className="h-4 w-4 text-sidebar-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Shopify CN Pro</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="打开导航菜单"
              aria-expanded={mobileNavigationOpen}
              aria-controls="mobile-dashboard-navigation"
              className="size-11"
              onClick={() => setMobileNavigationOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
          {children}
        </main>
      </div>
    </DashboardContext.Provider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-label="正在加载看板" />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
