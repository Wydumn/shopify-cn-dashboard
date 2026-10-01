"use client";

import { useState, useMemo } from "react";
import { Users, Search, Download, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { computeRFM, computeSegmentStats, getMarketingSuggestions, generateDemoRFM, DEFAULT_THRESHOLDS, SEGMENT_CONFIG } from "@/lib/rfm-analytics";
import { formatCny } from "../helpers";
import { EXCHANGE_RATE } from "../config";

interface CustomerSegmentationPanelProps {
  isDemo: boolean; shopUrl: string; accessToken: string; shopName: string;
  orders?: { customer: { id: number; first_name?: string; last_name?: string; email?: string }; customer_id?: number; total_price: number; created_at: string }[];
  customers?: { id: number; first_name?: string; last_name?: string; email?: string; default_address?: { country?: string } }[];
}

const SEGMENT_LINE_COLORS = {
  champion: "var(--chart-2)",
  loyal: "var(--chart-3)",
  potential: "var(--chart-4)",
  lowActivity: "var(--chart-5)",
  atRisk: "var(--destructive)",
  lost: "var(--muted-foreground)",
} as const;

const SEGMENT_STYLES = {
  champion: { background: "var(--success-bg)", border: "var(--success-border)", color: "var(--success-text)" },
  loyal: { background: "var(--info-bg)", border: "var(--info-border)", color: "var(--info-text)" },
  potential: { background: "var(--warning-bg)", border: "var(--warning-border)", color: "var(--warning-text)" },
  lowActivity: { background: "var(--accent)", border: "var(--border)", color: "var(--muted-foreground)" },
  atRisk: { background: "var(--destructive-bg)", border: "var(--destructive-border)", color: "var(--destructive-text)" },
  lost: { background: "var(--muted)", border: "var(--border)", color: "var(--muted-foreground)" },
} as const;

export default function CustomerSegmentationPanel({ isDemo, shopUrl, accessToken, shopName, orders, customers }: CustomerSegmentationPanelProps) {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [showConfig, setShowConfig] = useState(false);
  const [filterSegment, setFilterSegment] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(0);
  const [showMigration, setShowMigration] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(function () { setToast(""); }, 3000); };
  void shopUrl;
  void accessToken;

  const data = useMemo(function () { return isDemo ? generateDemoRFM() : computeRFM(orders || [], customers || [], thresholds); }, [isDemo, orders, customers, thresholds]);
  const segments = useMemo(function () { return computeSegmentStats(data); }, [data]);
  const suggestions = useMemo(function () { return getMarketingSuggestions(segments); }, [segments]);

  const filtered = useMemo(function () {
    let list = data;
    if (filterSegment !== "all") list = list.filter(function (c) { return c.segment === filterSegment; });
    if (search) { const q = search.toLowerCase(); list = list.filter(function (c) { return c.name.toLowerCase().indexOf(q) !== -1 || c.email.toLowerCase().indexOf(q) !== -1; }); }
    return list;
  }, [data, filterSegment, search]);

  const pyramidData = useMemo(function () {
    return segments.map(function (s) { return { segment: s.segment, name: s.label, count: s.count, gmv: Math.round(s.totalSpent * EXCHANGE_RATE), fill: s.color }; });
  }, [segments]);

  const trendData = useMemo(function () {
    const months = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
    return months.map(function (m) {
      const entry: Record<string, unknown> = { month: m };
      segments.forEach(function (s) { const key = s.segment; entry[key] = Math.round(s.count * (0.7 + Math.random() * 0.6)); });
      return entry;
    });
  }, [segments]);

  const exportCSV = function () {
    const rows = filtered.map(function (c) { return [c.name, c.email, String(c.rScore), String(c.fScore), String(c.mScore), String(c.composite), String(c.totalSpent), String(c.orderCount), String(c.lastOrderDays), SEGMENT_CONFIG[c.segment].label]; });
    const csv = "﻿" + [["姓名","邮箱","R","F","M","总分","累计消费","订单数","距上次","群体"]].concat(rows).map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g,'""') + '"'; }).join(","); }).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = shopName + "_客户分层.csv";
    a.click();
    showToast("已导出");
  };

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_12px_30px_rgba(0,0,0,0.12)]">{toast}</div>}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span>客户分层 RFM</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {shopName} · {data.length} 位客户
            {isDemo && <span className="ml-2 text-xs text-muted-foreground">演示</span>}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={function () { setShowConfig(true); }}
          className="h-9 gap-1.5 border-input bg-card text-sm text-foreground hover:bg-accent"
        >
          <Settings className="h-3.5 w-3.5" />
          阈值
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { value: data.length, label: "总客户数" },
          { value: segments[0]?.count || 0, label: "核心客户", tone: "champion" },
          { value: segments[4]?.count || 0, label: "流失风险", tone: "atRisk" },
          { value: "¥" + Math.round(segments.reduce(function (s, x) { return s + x.totalSpent; }, 0) / (data.length || 1)), label: "平均 LTV" },
        ].map(function (stat, index) {
          const tone = stat.tone ? SEGMENT_STYLES[stat.tone as keyof typeof SEGMENT_STYLES] : undefined;
          return (
            <Card key={index} className="border border-border bg-card shadow-none">
              <CardContent className="p-3 text-center">
                <p className="text-[1.75rem] font-semibold tracking-[-0.025em] text-foreground tabular-nums" style={tone ? { color: tone.color } : undefined}>{stat.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border border-border bg-card shadow-none">
        <CardContent className="p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">客户金字塔</p>
          <div className="space-y-2">
            {pyramidData.map(function (segment) {
              const tone = SEGMENT_STYLES[segment.segment as keyof typeof SEGMENT_STYLES];
              const width = Math.max(8, (segment.count / (data.length || 1)) * 100);
              return (
                <div key={segment.segment} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 text-right text-muted-foreground">{segment.name}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md border border-border bg-muted/70">
                    <div
                      className="flex h-full items-center justify-end rounded-md px-1.5 text-[9px] font-medium"
                      style={{ width: width + "%", background: tone.background, color: tone.color }}
                    >
                      {segment.count}人
                    </div>
                  </div>
                  <span className="w-16 text-right text-muted-foreground tabular-nums">{formatCny(segment.gmv)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card shadow-none">
        <CardContent className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="relative min-w-[140px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={function (e) { setSearch(e.target.value); }} placeholder="搜索客户..." className="h-8 border-input bg-background pl-8 text-sm text-foreground placeholder:text-muted-foreground" />
          </div>
          <select
            value={filterSegment}
            onChange={function (e) { setFilterSegment(e.target.value); }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none ring-0 focus:border-ring"
          >
            <option value="all">全部群体</option>
            {segments.map(function (s) { return <option key={s.segment} value={s.segment}>{s.label}</option>; })}
          </select>
          <Button size="sm" variant="outline" onClick={function () { setShowMigration(!showMigration); }} className="h-8 border-input bg-card text-xs text-foreground hover:bg-accent">{showMigration ? "隐藏迁徙" : "迁徙矩阵"}</Button>
          <Button size="sm" variant="outline" onClick={exportCSV} className="h-8 gap-1 border-input bg-card text-xs text-foreground hover:bg-accent"><Download className="h-3.5 w-3.5" />导出</Button>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto border border-border bg-card shadow-none">
        <CardContent className="p-0">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-[11px] font-medium text-muted-foreground">
                <th className="py-2 pl-3 text-left">客户</th>
                <th className="w-8 px-2 py-2 text-center">R</th>
                <th className="w-8 px-2 py-2 text-center">F</th>
                <th className="w-8 px-2 py-2 text-center">M</th>
                <th className="w-10 px-2 py-2 text-center">总分</th>
                <th className="px-2 py-2 text-right">消费¥</th>
                <th className="px-2 py-2 text-right">订单</th>
                <th className="px-2 py-2 text-right">距上次</th>
                <th className="px-2 py-2 text-center">群体</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map(function (c) {
                const cfg = SEGMENT_CONFIG[c.segment];
                const tone = SEGMENT_STYLES[c.segment];
                const isExpanded = expandedId === c.customerId;
                return (
                  <tr key={c.customerId} className="cursor-pointer border-b border-border/80 text-[12px] text-foreground transition-colors hover:bg-accent" onClick={function () { setExpandedId(isExpanded ? 0 : c.customerId); }}>
                    <td className="py-2 pl-3">
                      <p className="max-w-[160px] truncate font-medium text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.email}</p>
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums font-medium">{c.rScore}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{c.fScore}</td>
                    <td className="px-2 py-2 text-center tabular-nums">{c.mScore}</td>
                    <td className="px-2 py-2 text-center font-semibold tabular-nums text-foreground">{c.composite}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{formatCny(c.totalSpent * EXCHANGE_RATE)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{c.orderCount}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{c.lastOrderDays}天</td>
                    <td className="px-2 py-2 text-center">
                      <Badge className="border text-[10px] font-medium" style={{ background: tone.background, borderColor: tone.border, color: tone.color }}>{cfg.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {expandedId !== 0 && (function () {
        const c = data.find(function (x) { return x.customerId === expandedId; });
        if (!c) return null;
        return (
          <Card className="border border-border bg-card shadow-none" style={{ borderLeft: "3px solid var(--primary)" }}>
            <CardContent className="grid grid-cols-2 gap-3 p-3 text-xs text-foreground md:grid-cols-4">
              <p><span className="text-muted-foreground">首次购买:</span> {new Date(c.firstOrderDate).toLocaleDateString("zh-CN")}</p>
              <p><span className="text-muted-foreground">平均客单:</span> {formatCny(c.avgOrderValue * EXCHANGE_RATE)}</p>
              <p><span className="text-muted-foreground">国家:</span> {c.country || "—"}</p>
              <p><span className="text-muted-foreground">LTV:</span> {formatCny(c.totalSpent * EXCHANGE_RATE)}</p>
            </CardContent>
          </Card>
        );
      })()}

      {showMigration && (
        <Card className="border border-border bg-card shadow-none">
          <CardContent className="p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">客户迁徙矩阵（上期 → 本期）</p>
            <p className="text-xs text-muted-foreground">迁徙矩阵需要两期订单数据对比，请在真实模式下使用。</p>
          </CardContent>
        </Card>
      )}

      <Card className="border border-border bg-card shadow-none">
        <CardContent className="p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">群体趋势（近12月·模拟）</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)", fontSize: 10, boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)" }}
                labelStyle={{ color: "var(--foreground)" }}
                itemStyle={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}
              />
              {segments.map(function (s) {
                return <Line key={s.segment} type="monotone" dataKey={s.segment} stroke={SEGMENT_LINE_COLORS[s.segment]} strokeWidth={2} dot={false} />;
              })}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border border-border bg-card shadow-none">
        <CardContent className="space-y-2 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">精准营销建议</p>
          {suggestions.map(function (sg, index) {
            const cfg = SEGMENT_CONFIG[sg.segment];
            const tone = SEGMENT_STYLES[sg.segment];
            return (
              <div key={index} className="flex items-start gap-2 rounded-md border border-border bg-muted/60 p-2.5">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-medium" style={{ background: tone.background, borderColor: tone.border, color: tone.color }}>{cfg.label.slice(0, 2)}</div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{sg.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{sg.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">预估触达: <span className="font-medium text-foreground tabular-nums">{sg.reachCount}</span> 人</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {showConfig && (
        <div>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/5 p-4 backdrop-blur-[1px]">
            <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
              <h3 className="text-base font-semibold text-foreground">RFM 阈值配置</h3>
              {(["r","f","m"] as const).map(function (dim) {
                return <div key={dim} className="space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{dim === "r" ? "R·Recency" : dim === "f" ? "F·Frequency" : "M·Monetary"}</p>
                  <div className="flex gap-2">
                    {thresholds[dim].map(function (v, index) {
                      return <Input key={index} type="number" value={v} onChange={function (e) { const arr = thresholds[dim].slice(); arr[index] = Number(e.target.value) || 0; setThresholds({ ...thresholds, [dim]: arr }); }} className="h-8 w-16 border-input bg-background text-sm text-foreground" />;
                    })}
                  </div>
                </div>;
              })}
              <Button onClick={function () { setShowConfig(false); showToast("阈值已更新"); }} className="h-9 w-full bg-primary text-sm text-primary-foreground hover:opacity-95">确认</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
