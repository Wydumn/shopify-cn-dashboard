"use client";

import { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  TrendingUp,
  Repeat,
  Search,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCny, formatTimeAgo } from "../helpers";
import { exportCustomers } from "@/lib/export-utils";
import OrderTags from "./OrderTags";

// ─── Types ────────────────────────────────────────────

interface CustomerAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  default?: boolean;
}

interface CustomerOrder {
  id: number;
  order_number: string;
  total_price: number;
  created_at: string;
  financial_status: string;
}

interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  orders_count: number;
  total_spent: number;
  currency: string;
  created_at: string;
  updated_at: string;
  state: string;
  tags: string;
  accepts_marketing: boolean;
  default_address?: CustomerAddress;
  addresses?: CustomerAddress[];
  recent_orders?: CustomerOrder[];
}

type SortKey = "name" | "total_spent" | "orders_count" | "avg_order" | "last_order";

interface CustomerCenterPanelProps {
  customers: Customer[];
  isDemo: boolean;
  shopName: string;
  shopUrl: string;
  accessToken: string;
  onOrderClick?: (orderId: number) => void;
}

// ─── Helpers ──────────────────────────────────────────

function customerName(c: Customer): string {
  return (c.first_name + " " + c.last_name).trim();
}

function parseTags(tagsStr: string): string[] {
  return tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
}

function avgOrderValue(c: Customer): number {
  return c.orders_count > 0 ? c.total_spent / c.orders_count : 0;
}

// ─── KPI Cards ───────────────────────────────────────

function KPICard({ title, value, subtitle, icon: Icon, accent }: {
  title: string; value: string; subtitle: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: "emerald" | "sky" | "amber" | "purple";
}) {
  const colors = {
    emerald: "bg-success-bg text-success",
    sky: "bg-muted text-muted-foreground",
    amber: "bg-muted text-muted-foreground",
    purple: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] leading-[18px] text-muted-foreground">{title}</p>
            <p className="mt-1 text-[28px] font-semibold leading-[34px] tracking-[-0.025em] text-foreground tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className={"flex h-8 w-8 items-center justify-center rounded-md " + colors[accent]}>
            <Icon className="h-4 w-4" strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────

export default function CustomerCenterPanel({
  customers,
  isDemo,
  shopName,
  shopUrl,
  accessToken,
  onOrderClick,
}: CustomerCenterPanelProps) {
  // Filters
  const [filterName, setFilterName] = useState("");
  const [filterSpend, setFilterSpend] = useState("all");
  const [filterOrders, setFilterOrders] = useState("all");
  const [filterRecency, setFilterRecency] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterTag, setFilterTag] = useState("");

  const [referenceTime] = useState(() => Date.now());

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("total_spent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Detail Sheet
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  // Tag maps (for in-sheet edits)
  const [tagsMap, setTagsMap] = useState<Record<number, string>>({});
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDir((d) => d === "asc" ? "desc" : "asc"); }
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortIcon = (key: SortKey) => (
    sortKey === key ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null
  );

  // Filter
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (filterName) {
        const kw = filterName.toLowerCase();
        if (!customerName(c).toLowerCase().includes(kw) && !c.email.toLowerCase().includes(kw)) return false;
      }
      if (filterSpend === "low" && c.total_spent >= 500) return false;
      if (filterSpend === "mid" && (c.total_spent < 500 || c.total_spent > 2000)) return false;
      if (filterSpend === "high" && (c.total_spent < 2000 || c.total_spent > 10000)) return false;
      if (filterSpend === "top" && c.total_spent <= 10000) return false;
      if (filterOrders === "once" && c.orders_count !== 1) return false;
      if (filterOrders === "2to5" && (c.orders_count < 2 || c.orders_count > 5)) return false;
      if (filterOrders === "5plus" && c.orders_count <= 5) return false;
      if (filterRecency === "7d") {
        const d = new Date(c.updated_at);
        if ((referenceTime - d.getTime()) > 7 * 86400000) return false;
      }
      if (filterRecency === "30d") {
        const d = new Date(c.updated_at);
        if ((referenceTime - d.getTime()) > 30 * 86400000) return false;
      }
      if (filterRecency === "90d") {
        const d = new Date(c.updated_at);
        if ((referenceTime - d.getTime()) > 90 * 86400000) return false;
      }
      if (filterRecency === "dormant") {
        const d = new Date(c.updated_at);
        if ((referenceTime - d.getTime()) <= 90 * 86400000) return false;
      }
      if (filterCountry !== "all" && c.default_address?.country !== filterCountry) return false;
      if (filterTag && !c.tags.toLowerCase().includes(filterTag.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const comparison = sortKey === "name"
        ? customerName(a).localeCompare(customerName(b))
        : sortKey === "total_spent"
          ? a.total_spent - b.total_spent
          : sortKey === "orders_count"
            ? a.orders_count - b.orders_count
            : sortKey === "avg_order"
              ? avgOrderValue(a) - avgOrderValue(b)
              : new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [customers, filterName, filterSpend, filterOrders, filterRecency, filterCountry, filterTag, sortKey, sortDir, referenceTime]);

  // KPI calculations
  const newCustomers30d = useMemo(() => {
    const cutoff = referenceTime - 30 * 86400000;
    return customers.filter((c) => new Date(c.created_at).getTime() > cutoff).length;
  }, [customers, referenceTime]);
  const avgLtv = useMemo(() => {
    return customers.length > 0 ? customers.reduce((s, c) => s + c.total_spent, 0) / customers.length : 0;
  }, [customers]);
  const repeatRate = useMemo(() => {
    const repeat = customers.filter((c) => c.orders_count > 1).length;
    return customers.length > 0 ? (repeat / customers.length) * 100 : 0;
  }, [customers]);

  // Countries for dropdown
  const countries = useMemo(() =>
    [...new Set(customers.map((c) => c.default_address?.country).filter(Boolean))].sort() as string[],
    [customers],
  );

  // CSV export
  const handleExport = () => {
    exportCustomers(filtered, 7.25, shopName, isDemo);
  };

  const FINANCIAL_MAP: Record<string, string> = {
    paid: "border-success-border bg-success-bg text-success",
    pending: "border-warning-border bg-warning-bg text-warning",
    refunded: "border-destructive-border bg-destructive-bg text-destructive-text",
    cancelled: "border-border bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Users className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            客户管理中心
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            {shopName} · {customers.length} 位客户
            {isDemo && <span className="ml-2 text-xs text-muted-foreground">(演示数据)</span>}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} className="h-9 w-fit gap-1.5">
          <Download className="h-3.5 w-3.5" />导出 {filtered.length} 位客户
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard title="总客户数" value={String(customers.length)} subtitle="全部已注册客户" icon={Users} accent="purple" />
        <KPICard title="新客户 (30天)" value={String(newCustomers30d)} subtitle="近一个月新增" icon={UserPlus} accent="emerald" />
        <KPICard title="平均终身价值" value={formatCny(avgLtv * 7.25)} subtitle={"客均总消费"} icon={TrendingUp} accent="amber" />
        <KPICard title="回购率" value={repeatRate.toFixed(1) + "%"} subtitle={customers.filter((c) => c.orders_count > 1).length + " 人复购"} icon={Repeat} accent="sky" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-2 px-3 py-3 sm:flex sm:flex-wrap sm:items-center sm:px-4">
          <div className="relative col-span-2 min-w-0 sm:flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input value={filterName} onChange={(e) => setFilterName(e.target.value)} placeholder="搜索姓名或邮箱..." className="h-9 pl-7 text-sm" />
          </div>
          <select value={filterSpend} onChange={(e) => setFilterSpend(e.target.value)} className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground">
            <option value="all">全部消费</option>
            <option value="low">&lt; ¥500</option>
            <option value="mid">¥500 - 2,000</option>
            <option value="high">¥2,000 - 10,000</option>
            <option value="top">&gt; ¥10,000</option>
          </select>
          <select value={filterOrders} onChange={(e) => setFilterOrders(e.target.value)} className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground">
            <option value="all">全部订单数</option>
            <option value="once">单次客户</option>
            <option value="2to5">2-5 次</option>
            <option value="5plus">5 次以上</option>
          </select>
          <select value={filterRecency} onChange={(e) => setFilterRecency(e.target.value)} className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground">
            <option value="all">全部活跃度</option>
            <option value="7d">近 7 天购买</option>
            <option value="30d">近 30 天</option>
            <option value="90d">近 90 天</option>
            <option value="dormant">90 天以上未回购</option>
          </select>
          <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground">
            <option value="all">全部国家</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input value={filterTag} onChange={(e) => setFilterTag(e.target.value)} placeholder="标签关键词..." className="h-9 min-w-0 text-sm sm:w-28" />
          <label className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground sm:hidden">
            排序
            <select
              aria-label="客户排序"
              value={sortKey}
              onChange={(e) => { setSortKey(e.target.value as SortKey); setSortDir("desc"); }}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-foreground"
            >
              <option value="total_spent">总消费</option>
              <option value="name">客户姓名</option>
              <option value="orders_count">订单数</option>
              <option value="avg_order">客单价</option>
              <option value="last_order">最近购买</option>
            </select>
          </label>
          {(filterName || filterSpend !== "all" || filterOrders !== "all" || filterRecency !== "all" || filterCountry !== "all" || filterTag) && (
            <Button size="sm" variant="ghost" className="h-9 text-sm text-muted-foreground"
              onClick={() => { setFilterName(""); setFilterSpend("all"); setFilterOrders("all"); setFilterRecency("all"); setFilterCountry("all"); setFilterTag(""); }}>
              <X className="h-3 w-3" />清除
            </Button>
          )}
          <span className="col-span-2 text-sm text-muted-foreground sm:ml-auto">筛选出 {filtered.length} 位客户</span>
        </CardContent>
      </Card>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <>
            <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="py-2.5 pl-4 pr-2 text-left cursor-pointer select-none" onClick={() => handleSort("name")}>
                    <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">客户 {sortIcon("name")}</span>
                  </th>
                  <th className="py-2.5 px-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">联系方式</th>
                  <th className="py-2.5 px-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">国家</th>
                  <th className="py-2.5 px-2 text-right cursor-pointer select-none" onClick={() => handleSort("total_spent")}>
                    <span className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">总消费 {sortIcon("total_spent")}</span>
                  </th>
                  <th className="py-2.5 px-2 text-center cursor-pointer select-none" onClick={() => handleSort("orders_count")}>
                    <span className="flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">订单数 {sortIcon("orders_count")}</span>
                  </th>
                  <th className="py-2.5 px-2 text-right cursor-pointer select-none" onClick={() => handleSort("avg_order")}>
                    <span className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">客单价 {sortIcon("avg_order")}</span>
                  </th>
                  <th className="py-2.5 px-2 text-left cursor-pointer select-none" onClick={() => handleSort("last_order")}>
                    <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">最近购买 {sortIcon("last_order")}</span>
                  </th>
                  <th className="py-2.5 px-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">标签</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/10 transition-colors hover:bg-muted/10">
                    <td className="py-2.5 pl-4 pr-2">
                      <div>
                        <button type="button" onClick={() => setDetailCustomer(c)} className="text-left text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{customerName(c) || c.email}</button>
                        {c.state !== "enabled" && (
                          <Badge variant="outline" className="border-destructive-border bg-destructive-bg text-destructive-text mt-0.5">已禁用</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="text-sm text-muted-foreground">{c.email}</div>
                      {c.phone && <div className="text-xs text-muted-foreground/60">{c.phone}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Badge variant="outline" className="text-xs px-1.5 py-0 border-border/40">{c.default_address?.country ?? "-"}</Badge>
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-sm font-medium text-foreground">{formatCny(c.total_spent * 7.25)}</td>
                    <td className="py-2.5 px-2 text-center text-base text-foreground">{c.orders_count}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-base text-muted-foreground">{formatCny(avgOrderValue(c) * 7.25)}</td>
                    <td className="py-2.5 px-2 text-sm text-muted-foreground">{formatTimeAgo(c.updated_at)}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {parseTags(c.tags).slice(0, 2).map((t) => (
                          <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 border-border/30 text-muted-foreground">{t}</Badge>
                        ))}
                        {parseTags(c.tags).length > 2 && <span className="text-[9px] text-muted-foreground/60">+{parseTags(c.tags).length - 2}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDetailCustomer(c)}
                  className="w-full p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{customerName(c) || c.email}</p>
                      {customerName(c) && <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatCny(c.total_spent * 7.25)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                    <div><p className="text-muted-foreground">订单数</p><p className="mt-1 font-medium tabular-nums text-foreground">{c.orders_count}</p></div>
                    <div><p className="text-muted-foreground">客单价</p><p className="mt-1 font-medium tabular-nums text-foreground">{formatCny(avgOrderValue(c) * 7.25)}</p></div>
                    <div><p className="text-muted-foreground">最近购买</p><p className="mt-1 font-medium text-foreground">{formatTimeAgo(c.updated_at)}</p></div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{c.default_address?.country ?? "国家未知"}</span>
                    {c.state !== "enabled" && <Badge variant="outline" className="border-destructive-border bg-destructive-bg text-destructive-text">已禁用</Badge>}
                    {parseTags(c.tags).slice(0, 2).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                  </div>
                </button>
              ))}
            </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16">
              <Users className="h-12 w-12 text-muted-foreground/25" />
              <p className="text-base font-medium text-muted-foreground">暂无匹配的客户</p>
              <p className="text-sm text-muted-foreground/60">尝试调整筛选条件</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Sheet */}
      {detailCustomer && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDetailCustomer(null)} />
          <div role="dialog" aria-modal="true" aria-label="客户详情" className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-border bg-card shadow-popover">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-3">
              <div>
                <p className="text-base font-semibold text-foreground">{customerName(detailCustomer)}</p>
                <p className="text-xs text-muted-foreground">注册于 {new Date(detailCustomer.created_at).toLocaleDateString("zh-CN")}</p>
              </div>
              <Button size="sm" variant="ghost" aria-label="关闭客户详情" onClick={() => setDetailCustomer(null)} className="h-9 w-8 p-0"><X className="h-4 w-4" /></Button>
            </div>

            <div className="p-5 space-y-4">
              {/* Contact */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-base"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-foreground">{detailCustomer.email}</span></div>
                  {detailCustomer.phone && (
                    <div className="flex items-center gap-2 text-base"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-foreground">{detailCustomer.phone}</span></div>
                  )}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/10">
                    <div className="text-center"><p className="text-base font-semibold text-foreground tabular-nums">{formatCny(detailCustomer.total_spent * 7.25)}</p><p className="text-xs text-muted-foreground">总消费</p></div>
                    <div className="text-center"><p className="text-lg font-bold text-foreground tabular-nums">{detailCustomer.orders_count}</p><p className="text-xs text-muted-foreground">订单数</p></div>
                    <div className="text-center"><p className="text-base font-semibold text-foreground tabular-nums">{formatCny(avgOrderValue(detailCustomer) * 7.25)}</p><p className="text-xs text-muted-foreground">客单价</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Addresses */}
              <details className="group" open>
                <summary className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer mb-2">
                  <MapPin className="h-3 w-3" />地址簿 ({detailCustomer.addresses?.length ?? 0})
                  <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform ml-auto" />
                </summary>
                <div className="space-y-2">
                  {(detailCustomer.addresses ?? (detailCustomer.default_address ? [detailCustomer.default_address] : [])).map((addr, i) => (
                    <div key={i} className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2 text-sm">
                      {addr.default !== false && (
                        <Badge variant="outline" className="border-info-border bg-info-bg text-info mb-1">默认地址</Badge>
                      )}
                      <p className="text-foreground">{addr.address1}</p>
                      {addr.address2 && <p className="text-muted-foreground">{addr.address2}</p>}
                      <p className="text-muted-foreground">{addr.city}, {addr.province} {addr.zip}</p>
                      <p className="text-muted-foreground">{addr.country}</p>
                    </div>
                  ))}
                  {(!detailCustomer.addresses?.length && !detailCustomer.default_address) && (
                    <p className="text-sm text-muted-foreground/50">无地址记录</p>
                  )}
                </div>
              </details>

              {/* Recent Orders */}
              <details className="group" open>
                <summary className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer mb-2">
                  <ShoppingBag className="h-3 w-3" />最近订单 ({(detailCustomer.recent_orders ?? []).length})
                  <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform ml-auto" />
                </summary>
                <div className="space-y-1.5">
                  {(detailCustomer.recent_orders ?? []).length > 0 ? (
                    (detailCustomer.recent_orders ?? []).map((o) => (
                      <button
                        key={o.id}
                        onClick={(e) => { e.stopPropagation(); onOrderClick?.(o.id); }}
                        className="flex items-center justify-between w-full rounded-lg border border-border/20 bg-muted/10 px-3 py-2 hover:bg-muted/20 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-mono text-foreground">{o.order_number}</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("zh-CN")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{detailCustomer.currency} {o.total_price.toFixed(2)}</p>
                          <Badge className={FINANCIAL_MAP[o.financial_status] ?? "border-border bg-muted text-muted-foreground"}>
                            {o.financial_status === "paid" ? "已付款" : o.financial_status === "pending" ? "待付款" : o.financial_status === "refunded" ? "已退款" : o.financial_status}
                          </Badge>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground/50">无订单记录</p>
                  )}
                </div>
              </details>

              {/* Tags & Note */}
              <details className="group" open>
                <summary className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer mb-2">
                  <Tag className="h-3 w-3" />标签与备注
                  <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform ml-auto" />
                </summary>
                <div className="rounded-lg border border-border/20 bg-muted/10 px-3 py-2.5">
                  <OrderTags
                    orderId={detailCustomer.id}
                    tags={parseTags(tagsMap[detailCustomer.id] ?? detailCustomer.tags)}
                    note={noteMap[detailCustomer.id] ?? ""}
                    isDemo={isDemo}
                    shopUrl={shopUrl}
                    accessToken={accessToken}
                    onTagsChange={(tags) => setTagsMap((prev) => ({ ...prev, [detailCustomer.id]: tags.join(", ") }))}
                    onNoteChange={(note) => setNoteMap((prev) => ({ ...prev, [detailCustomer.id]: note }))}
                  />
                </div>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
