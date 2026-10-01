"use client";

import { Coins, Wallet, Receipt, DollarSign, ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCny } from "../helpers";

// ─── Types ────────────────────────────────────────────

interface FinancePanelProps {
  shopName: string;
  currency: string;
  exchangeRate: number;
  gmv: number;
  cogsRate: number; setCogsRate: (v: number) => void;
  shippingRate: number; setShippingRate: (v: number) => void;
  marketingRate: number; setMarketingRate: (v: number) => void;
  totalCostRate: number;
  profit: number;
  profitMargin: number;
  pieData: Array<{ name: string; value: number; color: string }>;
}

// ─── Sub-component ────────────────────────────────────

function KpiCard({ title, value, subtitle, icon: Icon, trend, trendValue }: {
  title: string; value: string; subtitle: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  trend: "up" | "down" | "neutral"; trendValue: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-[13px] leading-[18px] text-muted-foreground">{title}</p>
            <p className="break-words text-[28px] font-semibold leading-[34px] tracking-[-0.025em] tabular-nums text-foreground">{value}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {trend !== "neutral" && trendValue && (
                <span className={`inline-flex h-5 shrink-0 items-center gap-0.5 rounded-sm px-1.5 text-xs font-medium ${trend === "up" ? "bg-success-bg text-success" : "bg-destructive-bg text-destructive-text"}`}>
                  {trend === "up" ? <ArrowUp className="h-2 w-2" strokeWidth={2} /> : <ArrowDown className="h-2 w-2" strokeWidth={2} />}
                  {trendValue}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </div>
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Panel ─────────────────────────────────────────────

export default function FinancePanel(props: FinancePanelProps) {
  const { shopName, currency, exchangeRate, gmv, cogsRate, setCogsRate, shippingRate, setShippingRate, marketingRate, setMarketingRate, totalCostRate, profit, profitMargin, pieData } = props;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Coins className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          供应链对账
        </h2>
        <p className="mt-1 text-base text-muted-foreground">精细化成本核算与利润分析 · {shopName}</p>
      </div>

      {/* Cost Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">成本参数配置</CardTitle>
          <CardDescription>拖动滑块调整各项成本占比，实时查看利润变化</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[{ id: "cogs", label: "采购成本", value: cogsRate, set: setCogsRate, max: 60 },
              { id: "shipping", label: "物流运费", value: shippingRate, set: setShippingRate, max: 40 },
              { id: "marketing", label: "广告成本", value: marketingRate, set: setMarketingRate, max: 50 }].map((item) => (
              <div key={item.label} className="space-y-2">
                <label htmlFor={`finance-range-${item.id}`} className="text-sm font-medium text-foreground">{item.label} ({item.value}%)</label>
                <input id={`finance-range-${item.id}`} type="range" min={0} max={item.max} value={item.value} onChange={(e) => item.set(Number(e.target.value))} className="w-full accent-primary" />
                <Input type="number" min={0} max={100} aria-label={`${item.label}百分比`} value={item.value} onChange={(e) => item.set(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="h-9 font-mono text-sm" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-md bg-muted px-4 py-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">合计成本占比</span>
              <span className="font-semibold tabular-nums text-foreground">{totalCostRate}%</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">预计纯利润</span>
              <span className={profit >= 0 ? "font-semibold tabular-nums text-success" : "font-semibold tabular-nums text-destructive-text"}>{formatCny(profit)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <KpiCard title="预计纯利润" value={formatCny(profit)} subtitle={`成本合计 ${totalCostRate}%`} icon={Wallet} trend={profit >= 0 ? "up" : "down"} trendValue={profit >= 0 ? "盈利中" : "亏损"} />
        <KpiCard title="预计毛利率" value={totalCostRate < 100 ? `${profitMargin.toFixed(1)}%` : "—"} subtitle={`${currency} ${ (profit / exchangeRate).toFixed(2)} · 扣除采购/物流/广告`} icon={Receipt} trend={profit >= 0 ? "up" : "down"} trendValue={profit >= 0 ? "盈利" : "亏损"} />
        <KpiCard title="今日 GMV" value={formatCny(gmv)} subtitle={`1 ${currency} = ¥${exchangeRate.toFixed(4)} · 原始货币 ${currency}`} icon={DollarSign} trend="neutral" trendValue="" />
      </div>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>利润构成分析</CardTitle>
          <CardDescription>采购、物流、广告成本与预计纯利占比</CardDescription>
        </CardHeader>
        <CardContent>
          <div role="img" aria-label="利润构成分析图表" className="h-[280px] w-full sm:h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="54%"
                  outerRadius="80%"
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, i) => (<Cell key={`cell-${i}`} fill={entry.color} />))}
                </Pie>
                <Tooltip formatter={(value: unknown) => formatCny(Number(value) || 0)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>利润构成分析数据</caption>
            <thead><tr><th scope="col">项目</th><th scope="col">金额</th></tr></thead>
            <tbody>{pieData.map((item) => <tr key={item.name}><th scope="row">{item.name}</th><td>{formatCny(item.value)}</td></tr>)}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
