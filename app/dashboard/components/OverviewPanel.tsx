"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  ArrowUp,
  ArrowDown,
  AlertCircle,
  ShoppingCart,
  DollarSign,
  Wallet,
  Receipt,
  Package,
  Store,
  RefreshCw,
  Download,
  Sparkles,
  Info,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ChevronDown,
  Calendar,
  Clock,
  Coins,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { formatCny, formatTimeAgo, getInventoryBadge, findNearestHoliday, getCountdown } from "../helpers";
import { REFUND_LOW_THRESHOLD, REFUND_HIGH_THRESHOLD } from "../config";
import DiagnosisReportView, { type DiagnosisReport } from "./DiagnosisReportView";
import { exportToCSV } from "@/lib/export-utils";
import { useDashboardMenu } from "../layout";

// ─── Types ────────────────────────────────────────────

interface StoreEntry {
  id: string; shopUrl: string; accessToken: string; shopName: string; isDemo?: boolean;
}

interface ChartPoint { hour: string; count?: number; sales: number; }

interface Order {
  id: number; created_at: string; total_price: string; financial_status: string;
  productId?: number;
  gateway?: string;
  shippingCountry?: string;
}

interface Product {
  id: number; title: string; image: string | null;
  totalSold: number; totalRevenue: number; inventory: number;
}

interface Holiday { date: string; localName: string; name: string; countryCode: string; }

interface DashboardData {
  success: true; shopName: string; domain: string; currency: string; exchangeRate: number;
  gmv: number; orderCount: number;
  charts: ChartPoint[]; products: Product[]; orders: Order[];
  holidaysData: Record<string, Array<{ date: string; localName: string; name: string; countryCode: string }>>;
  topCountries: string[]; lastUpdated: string;
}

interface OverviewPanelProps {
  data: DashboardData;
  currentStore: StoreEntry | null; stores: StoreEntry[];
  cogsRate: number; setCogsRate: (v: number) => void;
  shippingRate: number; setShippingRate: (v: number) => void;
  marketingRate: number; setMarketingRate: (v: number) => void;
  totalCostRate: number; profit: number; profitMargin: number;
  refundRate: number; refundedOrders: Order[]; refundAmount: number;
  pieData: Array<{ name: string; value: number; color: string }>;
  productRiskMap: Map<number, { level: string }>;
  fetchData: (store: StoreEntry) => void;
  handleStoreChange: (id: string | null) => void;
  handleStartDiagnosis: () => void;
  sheetOpen: boolean; setSheetOpen: (v: boolean) => void;
  diagnosing: boolean; diagnosis: DiagnosisReport | null; typewriterText: string;
  diagnosisError?: string | null;
}

// ─── Sub-components ───────────────────────────────────

function CnyValue({ amount }: { amount: number }) {
  const formatted = formatCny(amount);
  const match = /^([^\d]*)(\d.*)$/.exec(formatted);
  const symbol = match?.[1] ?? "";
  const number = match?.[2] ?? formatted;
  return (
    <>
      <span className="align-baseline text-[18px] font-medium">{symbol}</span>
      {number}
    </>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, trend, trendValue, flash, infoBar }: {
  title: string; value: React.ReactNode; subtitle: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  trend: "up" | "down" | "neutral"; trendValue: string;
  flash?: boolean; infoBar?: React.ReactNode;
}) {
  return (
    <Card className={`relative overflow-hidden ${flash ? "animate-[gmv-flash_0.6s_ease-in-out]" : ""}`}>
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[13px] font-medium leading-[18px] text-muted-foreground">{title}</p>
            <p className="text-[28px] font-semibold leading-[34px] tracking-[-0.025em] tabular-nums text-foreground">{value}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {trend !== "neutral" && trendValue ? (
                <span className={`inline-flex h-5 items-center gap-0.5 rounded-sm px-1.5 text-xs font-medium ${trend === "up" ? "bg-success-bg text-success" : "bg-destructive-bg text-destructive-text"}`}>
                  {trend === "up" ? <ArrowUp className="h-2 w-2" strokeWidth={2} /> : <ArrowDown className="h-2 w-2" strokeWidth={2} />}
                  {trendValue}
                </span>
              ) : null}
              {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
            </div>
          </div>
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        </div>
        {infoBar ? <div className="mt-3 border-t border-border pt-1.5 text-xs leading-4 tabular-nums text-muted-foreground">{infoBar}</div> : null}
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-popover">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{formatCny(payload[0].value)}</p>
    </div>
  );
}

// ─── Polling tick: generate new orders with product linkage ──

interface TickResult {
  orders: Order[];
  /** Map of productId → quantity sold in this tick */
  productSales: Map<number, number>;
}

function generateDemoTickOrders(
  startId: number,
  exchangeRate: number,
  currentHour: number,
  products: Product[],
): TickResult {
  if (Math.random() >= 0.5) return { orders: [], productSales: new Map() };
  if (products.length === 0) return { orders: [], productSales: new Map() };

  // Destination countries for multi-market linkage (US/GB/DE)
  const DEST_COUNTRIES = ["US", "US", "GB", "DE", "US"]; // US 60%, GB 20%, DE 20%

  const count = Math.random() < 0.5 ? 1 : 2;
  const orders: Order[] = [];
  const productSales = new Map<number, number>();

  for (let i = 0; i < count; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const qty = Math.random() < 0.3 ? 2 : 1;
    const unitPrice = 20 + Math.random() * 200;
    const totalPrice = (unitPrice * qty).toFixed(2);
    const destCountry = DEST_COUNTRIES[Math.floor(Math.random() * DEST_COUNTRIES.length)];
    const now = new Date();

    orders.push({
      id: startId + i,
      created_at: now.toISOString(),
      total_price: totalPrice,
      financial_status: Math.random() < 0.85 ? "paid" : "pending",
      productId: product.id,
      shippingCountry: destCountry,
    });

    const existing = productSales.get(product.id) || 0;
    productSales.set(product.id, existing + qty);
  }
  return { orders, productSales };
}

// ─── Intl helpers (native, no hardcoded dictionary) ──

const regionNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });

function getCountryChineseName(code: string): string {
  return regionNames.of(code.toUpperCase()) || code;
}

// ─── Main Component ───────────────────────────────────

export default function OverviewPanel(props: OverviewPanelProps) {
  const { data: initialData, currentStore, stores, cogsRate, shippingRate, marketingRate, setCogsRate, setShippingRate, setMarketingRate, totalCostRate, profit, profitMargin, refundRate, refundedOrders, refundAmount, pieData, productRiskMap, fetchData, handleStoreChange, handleStartDiagnosis, sheetOpen, setSheetOpen, diagnosing, diagnosis, typewriterText, diagnosisError } = props;

  const { setActiveMenu } = useDashboardMenu();

  // ── Local reactive state ──
  // Initialize with current-hour truncation applied immediately (no future data flash)
  const mountHour = useMemo(() => new Date().getHours(), []);
  const initCharts = useMemo(
    () => initialData.charts.filter((p) => parseInt(p.hour, 10) <= mountHour),
    [initialData.charts, mountHour],
  );
  const [localGmv, setLocalGmv] = useState(initialData.gmv);
  const [localOrderCount, setLocalOrderCount] = useState(initialData.orderCount);
  const [localOrders, setLocalOrders] = useState<Order[]>(initialData.orders);
  const [chartData, setChartData] = useState<ChartPoint[]>(initCharts);
  const [localProducts, setLocalProducts] = useState<Product[]>(initialData.products.map((p) => ({ ...p })));
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());

  const handleExport = () => {
    buildOrderExport(localOrders, exchangeRate, initialData.shopName, cogsRate, shippingRate, marketingRate);
  };

  const nextOrderIdRef = useRef(Math.max(...initialData.orders.map((o) => o.id), 0) + 1);
  const localProductsRef = useRef(localProducts);
  localProductsRef.current = localProducts;

  // ── Holiday state (internal, no parent dependency) ──
  const availableCountries = useMemo(() => {
    const keys = Object.keys(initialData.holidaysData ?? {});
    return keys.length > 0 ? keys : (initialData.topCountries.length > 0 ? initialData.topCountries : ["US"]);
  }, [initialData.holidaysData, initialData.topCountries]);

  const [selectedCountry, setSelectedCountry] = useState(availableCountries[0] ?? "US");

  const localCountryHolidays = useMemo(() => {
    const result: Record<string, Holiday | null> = {};
    for (const code of availableCountries) {
      result[code] = findNearestHoliday(initialData.holidaysData?.[code] ?? []);
    }
    return result;
  }, [availableCountries, initialData.holidaysData]);

  const [localCountdown, setLocalCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const nearest = localCountryHolidays[selectedCountry];
    if (!nearest) { setLocalCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
    setLocalCountdown(getCountdown(nearest.date));
    const t = setInterval(() => setLocalCountdown(getCountdown(nearest.date)), 1000);
    return () => clearInterval(t);
  }, [selectedCountry, localCountryHolidays]);

  // Sync from parent on initial data change (store switch / first load)
  const dataRef = useRef(initialData);
  useEffect(() => {
    if (dataRef.current !== initialData) {
      dataRef.current = initialData;
      setLocalGmv(initialData.gmv);
      setLocalOrderCount(initialData.orderCount);
      setLocalOrders(initialData.orders);
      setLocalProducts(initialData.products.map((p) => ({ ...p })));

      // Cap initial chart data at current hour (no future data leak)
      const currentHour = new Date().getHours();
      const capped = initialData.charts.filter(
        (p) => parseInt(p.hour, 10) <= currentHour,
      );
      setChartData(capped);

      nextOrderIdRef.current = Math.max(...initialData.orders.map((o) => o.id), 0) + 1;
      setFlashIds(new Set());
    }
  }, [initialData]);

  // ── 30s heartbeat polling ──
  const chartDataRef = useRef(chartData);
  chartDataRef.current = chartData;

  useEffect(() => {
    const isDemo = !!currentStore?.isDemo;
    const exchangeRate = initialData.exchangeRate;

    const tick = () => {
      // ── Strict current-hour hardware lock ──
      const currentHour = new Date().getHours();

      if (isDemo) {
        const { orders: newOrders, productSales } = generateDemoTickOrders(
          nextOrderIdRef.current, exchangeRate, currentHour,
          localProductsRef.current,
        );
        if (newOrders.length === 0) return;

        nextOrderIdRef.current += newOrders.length;

        // ── Build fresh chart array capped at currentHour ──
        const prevChart = chartDataRef.current;

        // Determine new order sales total added to current hour
        const addedSales = newOrders.reduce(
          (sum, o) => sum + parseFloat(o.total_price) * exchangeRate, 0,
        );

        // Build chart: keep all hours 0..currentHour, zero out future hours
        const updatedChart: ChartPoint[] = [];
        let foundCurrent = false;

        for (let h = 0; h <= currentHour; h++) {
          const existing = prevChart.find((p) => parseInt(p.hour, 10) === h);
          if (h === currentHour) {
            foundCurrent = true;
            updatedChart.push({
              hour: `${String(h).padStart(2, "0")}:00`,
              sales: Math.round(((existing?.sales ?? 0) + addedSales) * 100) / 100,
              count: (existing?.count ?? 0) + newOrders.length,
            });
          } else if (existing) {
            updatedChart.push({ ...existing });
          }
        }

        // If currentHour bucket didn't exist, create it
        if (!foundCurrent) {
          updatedChart.push({
            hour: `${String(currentHour).padStart(2, "0")}:00`,
            sales: Math.round(addedSales * 100) / 100,
            count: newOrders.length,
          });
        }

        setChartData(updatedChart);

        // Update orders: prepend new ones
        const addedGmv = newOrders.reduce(
          (s, o) => s + parseFloat(o.total_price) * exchangeRate, 0,
        );

        setLocalOrders((prev) => [...newOrders, ...prev]);
        setLocalGmv((prev) => prev + addedGmv);
        setLocalOrderCount((prev) => prev + newOrders.length);

        // ── Product sales + inventory live update ──
        if (productSales.size > 0) {
          setLocalProducts((prev) => {
            const updated = prev.map((p) => {
              const qty = productSales.get(p.id);
              if (!qty) return p;
              return {
                ...p,
                totalSold: p.totalSold + qty,
                totalRevenue: p.totalRevenue + newOrders.reduce(
                  (sum, order) => order.productId === p.id ? sum + (parseFloat(order.total_price) || 0) : sum,
                  0,
                ),
                inventory: Math.max(0, p.inventory - qty),
              };
            });
            // Sort by totalSold descending for live leaderboard
            return [...updated].sort((a, b) => b.totalSold - a.totalSold);
          });
        }

        // Flash tracking
        const ids = new Set<number>();
        for (const o of newOrders) ids.add(o.id);
        setFlashIds(ids);
        setTimeout(() => setFlashIds(new Set()), 1200);
      } else {
        if (currentStore) fetchData(currentStore);
      }
    };

    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [currentStore, initialData.exchangeRate, fetchData]);

  // ── Derived props from data ──
  const { domain, currency, exchangeRate, holidaysData, topCountries, lastUpdated } = initialData;

  return (
    <div className="w-full space-y-6">
      {/* Demo Alert */}
      {currentStore?.isDemo && (
        <div className="flex items-center gap-3 rounded-lg border border-info-border bg-info-bg px-4 py-3">
          <Info className="h-4 w-4 shrink-0 text-info" strokeWidth={1.5} />
          <p className="text-[13px] text-foreground"><span className="font-semibold">演示环境</span> · 展示数据为模拟生成，可体验各模块交互，不会连接或修改真实店铺。</p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Store className="h-6 w-6 text-primary" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">数据看板</h1>
            <p className="max-w-full truncate text-base text-muted-foreground" title={`${domain} · ${formatTimeAgo(lastUpdated)}`}>{domain} &middot; {formatTimeAgo(lastUpdated)}</p>
          </div>
          {stores.length > 1 ? (
            <div className="ml-0 w-full sm:ml-4 sm:w-auto">
              <Select value={currentStore?.id ?? ""} onValueChange={handleStoreChange}>
                <SelectTrigger size="sm" className="w-full min-w-[200px] sm:w-auto">
                  <SelectValue>
                    <span className="flex items-center gap-2"><Store className="h-3.5 w-3.5 text-muted-foreground" />{currentStore?.shopName ?? "—"}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (<SelectItem key={s.id} value={s.id}><span className="flex items-center gap-2"><Store className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate max-w-[180px]">{s.shopName || s.shopUrl}</span></span></SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          ) : stores.length === 1 ? (
            <div className="ml-0 flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground sm:ml-4">
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
              {stores[0].shopName}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setSheetOpen(true)} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /><span>AI 智能诊断</span>
          </Button>
          <Button size="sm" onClick={handleExport} className="gap-1.5"><Download className="h-3.5 w-3.5" />导出报表</Button>
          <Button variant="ghost" size="sm" onClick={() => currentStore && fetchData(currentStore)} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />刷新</Button>

          {/* Heartbeat */}
          <div className="sm:ml-2 flex items-center gap-2 rounded-full border border-success-border bg-success-bg px-3 py-1.5">
            <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-success" />
            <span className="text-[11px] font-medium whitespace-nowrap text-success">Live · 30s 同步</span>
          </div>
        </div>
      </header>

      {/* Risk / exception bar — spec §6.2 */}
      {refundRate >= REFUND_HIGH_THRESHOLD ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive-border bg-destructive-bg p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-destructive-text" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-semibold text-foreground">退款率异常：{refundRate.toFixed(1)}%</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">退款 {refundedOrders.length}/{localOrderCount} 单 · {formatCny(refundAmount * exchangeRate)} · 建议核查异常订单及关联广告表现</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button size="sm" className="h-[30px] gap-1.5 bg-destructive px-3 text-white hover:bg-destructive/90" onClick={() => setActiveMenu("orders")}>查看异常订单详情</Button>
            <Button size="sm" variant="outline" className="h-[30px] gap-1.5 border-destructive-border px-3 text-destructive-text hover:bg-destructive-bg" onClick={() => setActiveMenu("ad")}>查看广告表现</Button>
          </div>
        </div>
      ) : refundRate >= REFUND_LOW_THRESHOLD ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-warning-border bg-warning-bg px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.5} />
            <p className="text-[13px] text-foreground">需关注：退款率 {refundRate.toFixed(1)}% · 退款 {refundedOrders.length}/{localOrderCount} 单，接近风险阈值</p>
          </div>
          <button type="button" className="shrink-0 text-xs font-medium text-warning underline-offset-2 hover:underline" onClick={() => setActiveMenu("orders")}>查看明细</button>
        </div>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">账户健康度正常 · 退款 {refundedOrders.length}/{localOrderCount} 单（{refundRate.toFixed(1)}%），低于 {REFUND_LOW_THRESHOLD.toFixed(1)}% 风险阈值</p>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="今日 GMV（人民币）" value={<CnyValue amount={localGmv} />} subtitle={`原始货币 ${currency}`} icon={DollarSign} trend="neutral" trendValue="" infoBar={<span>{currency}-CNY: {exchangeRate.toFixed(4)}</span>} flash={flashIds.size > 0} />
        <KpiCard title="今日订单数" value={`${localOrderCount} 单`} subtitle={`客单价 ${formatCny(localOrderCount > 0 ? localGmv / localOrderCount : 0)}`} icon={ShoppingCart} trend="neutral" trendValue="" />
        <KpiCard title="预计纯利润" value={<CnyValue amount={profit} />} subtitle={`成本占比 ${totalCostRate}%`} icon={Wallet} trend={profit >= 0 ? "up" : "down"} trendValue={profit >= 0 ? "盈利中" : "亏损"} />
        <KpiCard title="预计毛利率" value={totalCostRate < 100 ? `${profitMargin.toFixed(1)}%` : "—"} subtitle="扣除采购/物流/广告" icon={Receipt} trend={profit >= 0 ? "up" : "down"} trendValue={profit >= 0 ? "盈利" : "亏损"} />
      </div>

      {/* Holiday Countdown */}
      {availableCountries.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-base font-medium text-foreground">节日营销日历</p>
                <Select value={selectedCountry} onValueChange={(v) => v && setSelectedCountry(v)}>
                  <SelectTrigger size="sm" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCountries.map((code) => {
                      const codeUpper = code.toUpperCase();
                      const cnName = getCountryChineseName(codeUpper);
                      return (
                        <SelectItem key={code} value={code}>
                          <span className="flex items-center gap-1.5">
                            {cnName} <span className="text-muted-foreground">({codeUpper})</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {localCountryHolidays[selectedCountry] ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-base font-semibold text-foreground">
                      {localCountryHolidays[selectedCountry]!.localName}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        ({localCountryHolidays[selectedCountry]!.name})
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{localCountryHolidays[selectedCountry]!.date}</p>
                  </div>
                  <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  <div className="flex items-center gap-3">
                    {[{ label: "天", value: localCountdown.days }, { label: "时", value: localCountdown.hours }, { label: "分", value: localCountdown.minutes }, { label: "秒", value: localCountdown.seconds }].map((u, i, arr) => (
                      <span key={u.label} className="flex items-center gap-3">
                        {i > 0 && <span className="text-lg font-light text-muted-foreground">:</span>}
                        <div className="text-center">
                          <span className="block text-2xl font-bold tabular-nums text-foreground">{String(u.value).padStart(2, "0")}</span>
                          <span className="text-sm text-muted-foreground">{u.label}</span>
                        </div>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-base text-muted-foreground">
                  目标市场 {selectedCountry} 暂无公共节日大促，建议保持日常广告预算稳定。
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>实时销量趋势</CardTitle><CardDescription>今日各小时销售额（CNY）</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs><linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.05} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `¥${v}`} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="sales" stroke="var(--chart-1)" strokeWidth={2} fill="url(#salesGradient)" dot={false} isAnimationActive={false} activeDot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">利润构成</CardTitle><CardDescription>成本 + 利润占比</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={54} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name">{pieData.map((e, i) => (<Cell key={`c-${i}`} fill={e.color} />))}</Pie>
                  <Tooltip formatter={(v: unknown) => formatCny(Number(v) || 0)} />
                  <Legend verticalAlign="bottom" height={36} iconType="square" iconSize={8} formatter={(v: string) => <span style={{ color: "var(--muted-foreground)", fontSize: "12px" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-muted-foreground" />热销商品 Top {localProducts.length}</CardTitle>
          <CardDescription>今日销量排名 · 新订单实时置顶插入</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="w-12">#</TableHead><TableHead>商品</TableHead><TableHead className="text-right">销量</TableHead><TableHead className="text-right">销售额 (CNY)</TableHead><TableHead className="text-right">库存</TableHead><TableHead className="text-right w-24">库存状态</TableHead><TableHead className="text-right w-28">风控评级</TableHead></TableRow></TableHeader>
            <TableBody>
              {localProducts.map((p, i) => {
                const badge = getInventoryBadge(p.inventory);
                const risk = productRiskMap.get(p.id);
                const isFlash = flashIds.size > 0 && i < 2;
                return (
                  <TableRow key={p.id} className={`group transition-colors duration-500 ${isFlash ? "bg-success-bg" : ""}`}>
                    <TableCell className="font-medium text-muted-foreground">{String(i + 1).padStart(2, "0")}</TableCell>
                    <TableCell><div className="flex items-center gap-3">{p.image ? <img src={p.image} alt={p.title} className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border/30" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border/30"><Package className="h-4 w-4 text-muted-foreground" /></div>}<span className="max-w-[220px] truncate font-medium text-foreground">{p.title}</span></div></TableCell>
                    <TableCell className="text-right tabular-nums">{p.totalSold}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">{formatCny(p.totalRevenue * exchangeRate)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{p.inventory}</TableCell>
                    <TableCell className="text-right">{badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : <span className="text-sm text-muted-foreground">库存充足</span>}</TableCell>
                    <TableCell className="text-right">
                      {risk?.level === "高危欺诈" ? <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-destructive-border bg-destructive-bg px-1.5 text-[11px] font-medium text-destructive-text"><ShieldX className="h-3 w-3" strokeWidth={1.5} />高危欺诈</span>
                        : risk?.level === "需关注" ? <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-warning-border bg-warning-bg px-1.5 text-[11px] font-medium text-warning"><ShieldAlert className="h-3 w-3" strokeWidth={1.5} />需关注</span>
                        : <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-success-border bg-success-bg px-1.5 text-[11px] font-medium text-success"><ShieldCheck className="h-3 w-3" strokeWidth={1.5} />低风险</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost & Profit Settings (moved out of the core view) */}
      <details className="group rounded-xl border border-border/60 bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <Coins className="h-4 w-4" />
          成本与利润参数
          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid grid-cols-1 gap-3 border-t border-border/60 px-4 py-4 sm:grid-cols-3 sm:px-5">
          {[{ id: "cogs", label: "采购成本", value: cogsRate, set: setCogsRate }, { id: "shipping", label: "物流运费", value: shippingRate, set: setShippingRate }, { id: "marketing", label: "广告成本", value: marketingRate, set: setMarketingRate }].map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <label htmlFor={`overview-cost-${item.id}`} className="min-w-0 flex-1 text-sm text-muted-foreground">{item.label}</label>
              <Input id={`overview-cost-${item.id}`} type="number" min={0} max={100} value={item.value} onChange={(e) => item.set(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="h-9 w-20 text-center text-sm" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-sm text-muted-foreground sm:col-span-3 sm:justify-end">
            <span>合计成本：{totalCostRate}%</span>
            <span className={profit >= 0 ? "font-medium text-success" : "font-medium text-destructive-text"}>利润率：{totalCostRate < 100 ? profitMargin.toFixed(1) : "—"}%</span>
          </div>
        </div>
      </details>

      {/* AI Diagnosis Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg border-l border-border/60 bg-card">
          <SheetHeader className="border-b border-border/30 pb-4">
            <SheetTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />AI 跨境操盘手智能诊断</SheetTitle>
            <SheetDescription>{currentStore?.isDemo ? "演示模式" : "基于今日数据的智能分析"}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <DiagnosisReportView
              diagnosing={diagnosing}
              diagnosis={diagnosis}
              typewriterText={typewriterText}
              diagnosisError={diagnosisError}
              shopName={initialData.shopName}
              isDemo={currentStore?.isDemo}
              onStart={handleStartDiagnosis}
            />
          </div>
          <SheetFooter className="border-t border-border/30 pt-4">
            <p className="text-center text-sm text-muted-foreground">{currentStore?.isDemo ? "演示数据仅供体验" : "Powered by DeepSeek · 本地运行"}</p>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Export Handle ────────────────────────────────────

function buildOrderExport(
  orders: Order[],
  rate: number,
  shopName: string,
  cogsRate: number,
  shippingRate: number,
  marketingRate: number,
) {
  const PAY: Record<string, string> = { paid: "已支付", pending: "待处理", authorized: "已授权", refunded: "已退款", voided: "已作废" };
  function calcGatewayFeeCny(order: Order): number {
    const usd = parseFloat(order.total_price) || 0;
    const gw = (order.gateway || "").toLowerCase();
    return gw.includes("paypal") ? (usd * 0.044 + 0.3) * rate : (usd * 0.034 + 0.3) * rate;
  }

  const headers = ["订单编号", "下单时间(北京时间)", "目的国", "支付网关", "总额(USD)", "总额(CNY)", "网关手续费(CNY)", "商品成本(CNY)", "物流运费(CNY)", "广告成本(CNY)", "净纯利润(CNY)"];
  const rows = orders.map((o) => {
    const usd = parseFloat(o.total_price) || 0;
    const cny = usd * rate;
    const t = new Date(new Date(o.created_at).getTime() + 8 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 16);
    const country = (o as any).shippingCountry || "未知";
    const gatewayFee = calcGatewayFeeCny(o);
    const costCny = (usd * cogsRate / 100) * rate;
    const shipCny = (usd * shippingRate / 100) * rate;
    const adCny = (usd * marketingRate / 100) * rate;
    const netProfit = cny - gatewayFee - costCny - shipCny - adCny;
    return [String(o.id), t, country, o.gateway || "未知", usd.toFixed(2), cny.toFixed(2), gatewayFee.toFixed(2), costCny.toFixed(2), shipCny.toFixed(2), adCny.toFixed(2), netProfit.toFixed(2)];
  });

  const d = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "");
  exportToCSV("Shopify_全维度财务对账单_" + shopName + "_" + d + ".csv", headers, rows);
}
