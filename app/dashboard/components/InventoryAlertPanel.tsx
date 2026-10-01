"use client";

import { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle, Gauge, Search, Download, ChevronDown, ChevronRight, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

/* ─── Types ──────────────────────────────────────────── */

interface VariantStock {
  variantId: number; productId: number; productTitle: string; variantName: string; sku: string;
  inventory: number; sales30d: number; dailyAvg: number; daysCovered: number | null;
  suggestReorder: number; status: "critical" | "low" | "reorder" | "ok" | "soldOut";
  vendor: string; productType: string; image: string | null;
  shopUrl: string;
}

interface InventoryAlertPanelProps {
  isDemo: boolean; shopUrl: string; accessToken: string; shopName: string;
  fullProducts?: Array<{ id: number; title: string; vendor: string; productType: string; image: string | null; status: string; shopName: string; variants: Array<{ variantId: number; name: string; sku: string; price: number; inventory: number }> }>;
  variantSales?: Record<number, number>;
}

/* ─── Seeded Random (Demo) ────────────────────────────── */

function mulberry32(seed: number) { return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function generateDemoSales(variantId: number): { sales30d: number; daily: number[] } {
  const rng = mulberry32(variantId * 31 + 7);
  const daily: number[] = [];
  let total = 0;
  for (let i = 0; i < 30; i++) {
    const s = Math.max(0, Math.round(rng() * 5 + rng() * (variantId % 7)));
    daily.push(s); total += s;
  }
  return { sales30d: total, daily };
}

/* ─── Mini Chart ──────────────────────────────────────── */

function MiniSalesChart({ data }: { data: number[] }) {
  const chartData = data.map((v, i) => ({ day: i + 1, sales: v }));
  return (
    <div className="h-[72px] w-full max-w-[320px] sm:w-[200px] sm:shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="sales" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--card-foreground)", fontSize: 12 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────── */

const STATUS_CONFIG = {
  critical: { label: "即将断货", text: "text-destructive-text", surface: "bg-destructive-bg", badge: "border-destructive-border bg-destructive-bg text-destructive-text" },
  low: { label: "库存偏低", text: "text-warning", surface: "bg-warning-bg", badge: "border-warning-border bg-warning-bg text-warning" },
  reorder: { label: "建议补货", text: "text-warning", surface: "bg-warning-bg", badge: "border-warning-border bg-warning-bg text-warning" },
  ok: { label: "库存充足", text: "text-success", surface: "bg-success-bg", badge: "border-success-border bg-success-bg text-success" },
  soldOut: { label: "已售罄", text: "text-muted-foreground", surface: "bg-muted", badge: "border-border bg-muted text-muted-foreground" },
};

function loadHidden(): number[] { try { return JSON.parse(localStorage.getItem("inv_hidden_variants") || "[]"); } catch { return []; } }
function saveHidden(ids: number[]) { localStorage.setItem("inv_hidden_variants", JSON.stringify(ids)); const now = Date.now(); localStorage.setItem("inv_hidden_at", String(now)); }

export default function InventoryAlertPanel({ isDemo, shopUrl, shopName, fullProducts, variantSales }: InventoryAlertPanelProps) {
  const [safetyDays, setSafetyDays] = useState(30);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"daysCovered" | "sales" | "inventory">("daysCovered");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(() => new Set(loadHidden()));
  const [inTransit, setInTransit] = useState<Record<number, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Clear hidden after 24h
  useEffect(() => { const at = localStorage.getItem("inv_hidden_at"); if (at && Date.now() - Number(at) > 86400000) { localStorage.removeItem("inv_hidden_variants"); setHiddenIds(new Set()); } }, []);

  /* ── Build variant stock list ───────────────────────── */
  const variants = useMemo(() => {
    const result: VariantStock[] = [];
    const products = isDemo ? DEMO_PRODUCTS : (fullProducts || []);

    for (const p of products) {
      for (const v of p.variants) {
        let sales30d = 0, daily: number[] = [];
        if (isDemo) {
          const d = generateDemoSales(v.variantId);
          sales30d = d.sales30d; daily = d.daily;
        } else {
          sales30d = variantSales?.[v.variantId] || 0;
          daily = new Array(30).fill(0);
        }

        const dailyAvg = sales30d / 30;
        const daysCovered = dailyAvg > 0 ? v.inventory / dailyAvg : null;
        let status: VariantStock["status"];
        if (v.inventory === 0) status = "soldOut";
        else if (!daysCovered || daysCovered === Infinity) status = "ok";
        else if (daysCovered < 7) status = "critical";
        else if (daysCovered < 14) status = "low";
        else if (daysCovered < 30) status = "reorder";
        else status = "ok";

        const inTrans = inTransit[v.variantId] || 0;
        const suggestReorder = Math.max(0, Math.ceil(safetyDays * dailyAvg - v.inventory - inTrans));

        result.push({
          variantId: v.variantId, productId: p.id, productTitle: p.title,
          variantName: v.name || "", sku: v.sku || "",
          inventory: v.inventory, sales30d, dailyAvg, daysCovered,
          suggestReorder, status, vendor: p.vendor || "", productType: p.productType || "",
          image: p.image, shopUrl: isDemo ? "demo" : (p as any).shopUrl || shopUrl,
        });
      }
    }
    return result;
  }, [isDemo, fullProducts, variantSales, safetyDays, inTransit]);

  /* ── Filter & sort ──────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = variants.filter((v) => !hiddenIds.has(v.variantId));
    if (search) { const q = search.toLowerCase(); list = list.filter((v) => v.productTitle.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q)); }
    if (filterStatus !== "all") list = list.filter((v) => v.status === filterStatus);
    list.sort((a, b) => {
      if (sortBy === "daysCovered") { const da = a.daysCovered ?? Infinity, db = b.daysCovered ?? Infinity; return da - db; }
      if (sortBy === "sales") return b.sales30d - a.sales30d;
      return a.inventory - b.inventory;
    });
    return list;
  }, [variants, search, filterStatus, sortBy, hiddenIds]);

  /* ── KPI counts ────────────────────────────────────── */
  const kpi = useMemo(() => {
    const counts = { ok: 0, reorder: 0, low: 0, critical: 0, soldOut: 0 };
    variants.forEach((v) => counts[v.status]++);
    return counts;
  }, [variants]);

  /* ── Export CSV ─────────────────────────────────────── */
  const exportCSV = () => {
    const rows = filtered.filter((v) => (v.daysCovered ?? Infinity) < 30);
    const csv = "\uFEFF" + [["商品名","SKU","当前库存","近30天销量","日均销量","可售天数","建议补货量","供应商"], ...rows.map((v) => [v.productTitle + " - " + v.variantName, v.sku, String(v.inventory), String(v.sales30d), v.dailyAvg.toFixed(1), v.daysCovered !== null ? v.daysCovered.toFixed(1) : "∞", String(v.suggestReorder), v.vendor])].map((r) => r.map((c) => '"' + c.replace(/"/g,'""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${shopName}_补货清单_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast("补货清单已下载");
  };

  const markHidden = (variantId: number) => { const next = new Set(hiddenIds); next.add(variantId); setHiddenIds(next); saveHidden([...next]); showToast("已标记为已补货，24h 后自动恢复"); };

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-success-border bg-success-bg px-4 py-2 text-sm font-medium text-success shadow-sm">{toast}</div>}

      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Gauge className="h-5 w-5 text-muted-foreground" />库存健康面板</h2>
        <p className="mt-1 text-sm text-muted-foreground">{shopName} · {variants.length} 个 SKU{isDemo && <span className="ml-2 text-xs text-warning">(演示)</span>}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ k: "ok", n: "库存充足" },
          { k: "reorder", n: "建议补货" },
          { k: "critical", n: "即将断货" },
          { k: "soldOut", n: "已售罄" },
        ].map((item) => (
          <button
            key={item.k}
            type="button"
            aria-pressed={filterStatus === item.k}
            onClick={() => setFilterStatus(filterStatus === item.k ? "all" : item.k)}
            className={`rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${filterStatus === item.k ? `${STATUS_CONFIG[item.k as keyof typeof STATUS_CONFIG].surface} ${STATUS_CONFIG[item.k as keyof typeof STATUS_CONFIG].text} border-border` : "border-border bg-card text-foreground hover:bg-accent"}`}
          >
            <p className={`text-xs font-medium ${filterStatus === item.k ? STATUS_CONFIG[item.k as keyof typeof STATUS_CONFIG].text : "text-muted-foreground"}`}>{item.n}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi[item.k as keyof typeof kpi]}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
          <div className="relative min-w-0 w-full sm:min-w-[180px] sm:flex-1"><Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索商品/SKU..." className="h-9 pl-8 text-sm"/></div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm text-foreground sm:flex-none">
            <option value="all">全部状态</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm text-foreground sm:flex-none">
            <option value="daysCovered">按紧急度</option><option value="sales">按销量</option><option value="inventory">按库存</option>
          </select>
          <div className="flex flex-1 items-center gap-2 sm:flex-none"><span className="whitespace-nowrap text-xs text-muted-foreground">安全库存(天)</span><Input type="number" value={safetyDays} onChange={(e) => setSafetyDays(Number(e.target.value) || 30)} className="h-9 w-16 text-sm"/></div>
          <Button size="sm" variant="outline" onClick={exportCSV} className="h-9 w-full gap-1 text-sm sm:w-auto"><Download className="h-4 w-4"/>导出补货清单</Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="h-9 border-b border-border bg-muted text-xs font-medium text-muted-foreground">
                <th className="py-2 pl-3 text-left">商品 / SKU</th>
                <th className="py-2 px-2 text-right w-16">库存</th>
                <th className="py-2 px-2 text-right hidden md:table-cell">30天销量</th>
                <th className="py-2 px-2 text-right w-16">可售天数</th>
                <th className="py-2 px-2 text-right hidden md:table-cell">建议补货</th>
                <th className="py-2 px-2 text-center w-16">状态</th>
              </tr></thead>
              <tbody>
                {filtered.map((v) => {
                  const cfg = STATUS_CONFIG[v.status];
                  return (
                    <tr key={v.variantId} className="h-11 cursor-pointer border-b border-border bg-card transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setExpandedId(expandedId === v.variantId ? null : v.variantId)}>
                      <td className="py-2 pl-3 pr-2">
                        <div className="flex items-center gap-2">
                          {expandedId === v.variantId ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground"/> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground"/>}
                          <div className="min-w-0"><p className="max-w-[180px] truncate text-foreground">{v.productTitle}</p><p className="text-xs text-muted-foreground">{v.sku}</p></div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{v.inventory}</td>
                      <td className="hidden px-2 py-2 text-right tabular-nums md:table-cell">{v.sales30d}</td>
                      <td className={`px-2 py-2 text-right font-semibold tabular-nums ${(v.daysCovered ?? Infinity) < 7 ? "text-destructive-text" : (v.daysCovered ?? Infinity) < 14 ? "text-warning" : "text-foreground"}`}>{v.daysCovered !== null ? v.daysCovered < 100 ? v.daysCovered.toFixed(1) : "99+" : "∞"}</td>
                      <td className="hidden px-2 py-2 text-right tabular-nums md:table-cell">{v.suggestReorder > 0 ? v.suggestReorder : "—"}</td>
                      <td className="px-2 py-2 text-center"><Badge variant="outline" className={`h-5 border px-1.5 py-0 text-[11px] font-medium ${cfg.badge}`}>{cfg.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-base text-muted-foreground">暂无匹配数据</div>
          )}
        </CardContent>
      </Card>

      {/* Expanded detail (shown as overlay card) */}
      {expandedId !== null && (() => {
        const v = variants.find((x) => x.variantId === expandedId);
        if (!v) return null;
        const demoDaily = isDemo ? generateDemoSales(v.variantId).daily : new Array(30).fill(0);
        return (
          <Card className="border-border bg-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{v.productTitle}</p>
                  <p className="text-xs text-muted-foreground">SKU: {v.sku} · 供应商: {v.vendor || "—"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => markHidden(v.variantId)} className="h-8 w-full gap-1 text-xs sm:w-auto"><CheckCircle2 className="h-4 w-4"/>标记已补货</Button>
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <MiniSalesChart data={demoDaily} />
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  <p>日均销量: <span className="tabular-nums font-semibold">{v.dailyAvg.toFixed(1)}</span></p>
                  <p>近 30 天: <span className="tabular-nums font-semibold">{v.sales30d}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2"><p className="text-xs text-muted-foreground">当前库存</p><p className="text-lg font-semibold tabular-nums">{v.inventory}</p></div>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2"><p className="text-xs text-muted-foreground">可售天数</p><p className={`text-lg font-semibold tabular-nums ${(v.daysCovered ?? Infinity) < 7 ? "text-destructive-text" : (v.daysCovered ?? Infinity) < 14 ? "text-warning" : "text-foreground"}`}>{v.daysCovered !== null ? v.daysCovered.toFixed(1) : "∞"}</p></div>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">在途库存</p>
                  <Input type="number" value={inTransit[v.variantId] || 0} onChange={(e) => setInTransit((p) => ({ ...p, [v.variantId]: Number(e.target.value) || 0 }))} className="mt-1 h-8 w-full text-sm" min={0} />
                </div>
              </div>
              {v.suggestReorder > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>建议补货量：<strong className="tabular-nums">{v.suggestReorder}</strong> 件（安全库存 {safetyDays} 天 × 日均 {v.dailyAvg.toFixed(1)} — 库存 {v.inventory}{inTransit[v.variantId] ? ` — 在途 ${inTransit[v.variantId]}` : ""}）</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

/* ─── Demo Products ─────────────────────────────────────── */

const DEMO_PRODUCTS: Array<{ id: number; title: string; vendor: string; productType: string; image: string | null; status: string; shopName: string; variants: Array<{ variantId: number; name: string; sku: string; price: number; inventory: number }> }> = [
  { id: 1, title: "碳纤维手表 Chrono X", vendor: "TechGear Inc", productType: "可穿戴设备", image: null, status: "ACTIVE", shopName: "TechGear Pro",
    variants: [
      { variantId: 101, name: "黑色/42mm", sku: "TG-CX-BLK42", price: 299.99, inventory: 45 },
      { variantId: 102, name: "银色/46mm", sku: "TG-CX-SLV46", price: 349.99, inventory: 18 },
    ]},
  { id: 2, title: "无线降噪耳机 SonicFlow", vendor: "TechGear Inc", productType: "音频设备", image: null, status: "ACTIVE", shopName: "TechGear Pro",
    variants: [
      { variantId: 201, name: "默认", sku: "TG-SF-ANC", price: 149.99, inventory: 120 },
    ]},
  { id: 3, title: "AR 护目镜 Air", vendor: "TechGear Inc", productType: "可穿戴设备", image: null, status: "ACTIVE", shopName: "TechGear Pro",
    variants: [
      { variantId: 301, name: "默认", sku: "TG-ARG-AIR", price: 89.99, inventory: 3 },
    ]},
  { id: 4, title: "机械键盘 K8", vendor: "TechGear Inc", productType: "电脑外设", image: null, status: "DRAFT", shopName: "TechGear Pro",
    variants: [
      { variantId: 401, name: "青轴", sku: "TG-K8-BLU", price: 129.99, inventory: 5 },
      { variantId: 402, name: "红轴", sku: "TG-K8-RED", price: 119.99, inventory: 0 },
    ]},
  { id: 5, title: "北欧台灯 LUX", vendor: "MinimalHome", productType: "家居照明", image: null, status: "ACTIVE", shopName: "MinimalHome",
    variants: [
      { variantId: 501, name: "默认", sku: "MH-LUX1", price: 79.99, inventory: 40 },
    ]},
  { id: 6, title: "亚麻抱枕套", vendor: "MinimalHome", productType: "家居纺织品", image: null, status: "ACTIVE", shopName: "MinimalHome",
    variants: [
      { variantId: 601, name: "米白", sku: "MH-LIN-CRM", price: 39.99, inventory: 2 },
      { variantId: 602, name: "浅灰", sku: "MH-LIN-GRY", price: 44.99, inventory: 0 },
    ]},
];
