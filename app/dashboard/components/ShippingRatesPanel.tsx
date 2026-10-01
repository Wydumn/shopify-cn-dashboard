"use client";

import { useState, useMemo } from "react";
import { Truck, Calculator, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EXCHANGE_RATE } from "../config";
import { formatCny } from "../helpers";

/* ─── Types ──────────────────────────────────────────── */

interface ShippingRate {
  name: string;       // "标准运费" / "快递运费" / "免运费门槛"
  price: number;      // 当地币种
  currency: string;
}

interface CountryRate {
  countryCode: string; countryName: string; currency: string;
  freeThreshold: number | null;  // null = 无免运费
  standard: ShippingRate | null;
  express: ShippingRate | null;
  localPickup: boolean;
}

interface CarrierTime {
  name: string;
  countryTimes: Record<string, string>; // countryCode → "1-3 天" or "-"
}

interface WarehouseZone {
  warehouseName: string; countryCode: string;
  rules: Array<{ type: string; label: string; price: number; currency: string }>;
}

interface ShippingRatesPanelProps {
  isDemo: boolean; shopUrl: string; accessToken: string; shopName: string;
  shippingData?: {
    rates: CountryRate[]; carriers: CarrierTime[]; warehouseZones: WarehouseZone[];
  };
}

/* ─── Helpers ─────────────────────────────────────────── */

function toCny(price: number, currency: string): number {
  const rates: Record<string, number> = { USD: EXCHANGE_RATE, GBP: EXCHANGE_RATE * 1.27, EUR: EXCHANGE_RATE * 1.08, JPY: EXCHANGE_RATE * 0.049, AUD: EXCHANGE_RATE * 0.65, CAD: EXCHANGE_RATE * 0.72 };
  return Math.round(price * (rates[currency] || EXCHANGE_RATE) * 100) / 100;
}

/* ─── Demo Data ───────────────────────────────────────── */

const DEMO_RATES: CountryRate[] = [
  { countryCode: "US", countryName: "美国", currency: "USD", freeThreshold: 50, standard: { name: "标准运费", price: 4.99, currency: "USD" }, express: { name: "快递运费", price: 12.99, currency: "USD" }, localPickup: true },
  { countryCode: "GB", countryName: "英国", currency: "GBP", freeThreshold: 40, standard: { name: "标准运费", price: 3.99, currency: "GBP" }, express: { name: "快递运费", price: 9.99, currency: "GBP" }, localPickup: false },
  { countryCode: "DE", countryName: "德国", currency: "EUR", freeThreshold: 45, standard: { name: "标准运费", price: 4.99, currency: "EUR" }, express: { name: "快递运费", price: 11.99, currency: "EUR" }, localPickup: true },
  { countryCode: "JP", countryName: "日本", currency: "JPY", freeThreshold: 6000, standard: { name: "标准运费", price: 500, currency: "JPY" }, express: { name: "快递运费", price: 1500, currency: "JPY" }, localPickup: false },
  { countryCode: "FR", countryName: "法国", currency: "EUR", freeThreshold: 40, standard: { name: "标准运费", price: 5.99, currency: "EUR" }, express: { name: "快递运费", price: 12.99, currency: "EUR" }, localPickup: false },
];

const DEMO_CARRIERS: CarrierTime[] = [
  { name: "USPS", countryTimes: { US: "3-5 天" } },
  { name: "UPS", countryTimes: { US: "1-3 天", GB: "3-5 天", DE: "3-5 天", JP: "5-7 天" } },
  { name: "FedEx", countryTimes: { US: "1-2 天", GB: "2-3 天", DE: "2-3 天", JP: "3-5 天", FR: "2-3 天" } },
  { name: "DHL", countryTimes: { GB: "2-3 天", DE: "1-2 天", JP: "2-3 天", FR: "1-2 天" } },
];

const DEMO_WAREHOUSE_ZONES: WarehouseZone[] = [
  { warehouseName: "深圳仓", countryCode: "US", rules: [{ type:"weight",label:"0-500g",price:25,currency:"CNY"},{ type:"weight",label:"500-1000g",price:45,currency:"CNY"},{ type:"weight",label:"1-2kg",price:75,currency:"CNY"}] },
  { warehouseName: "深圳仓", countryCode: "DE", rules: [{ type:"weight",label:"0-500g",price:35,currency:"CNY"},{ type:"weight",label:"500-1000g",price:55,currency:"CNY"}] },
  { warehouseName: "FBA美东", countryCode: "US", rules: [{ type:"price",label:"免运费(FBA Prime)",price:0,currency:"USD"}] },
  { warehouseName: "FBA欧洲", countryCode: "DE", rules: [{ type:"weight",label:"0-1kg",price:3.99,currency:"EUR"},{ type:"weight",label:"1-5kg",price:7.99,currency:"EUR"}] },
];

export default function ShippingRatesPanel({ isDemo, shopUrl, accessToken, shopName, shippingData }: ShippingRatesPanelProps) {
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcWeight, setCalcWeight] = useState("500");
  const [calcPrice, setCalcPrice] = useState("");
  const [calcCountry, setCalcCountry] = useState("US");
  const [calcWarehouse, setCalcWarehouse] = useState("深圳仓");
  const [showWarehouse, setShowWarehouse] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const rates = isDemo ? DEMO_RATES : (shippingData?.rates || []);
  const carriers = isDemo ? DEMO_CARRIERS : (shippingData?.carriers || []);
  const warehouseZones = isDemo ? DEMO_WAREHOUSE_ZONES : (shippingData?.warehouseZones || []);
  const countries = rates.map((r) => ({ code: r.countryCode, name: r.countryName }));
  const visibleRates = selectedMarket === "all" ? rates : rates.filter((r) => r.countryCode === selectedMarket);

  // Rate difference analysis
  const rateAnalysis = useMemo(() => {
    if (rates.length < 2) return null;
    const stdPrices = rates.map((r) => ({ code: r.countryCode, name: r.countryName, price: r.standard ? toCny(r.standard.price, r.currency) : Infinity }));
    const max = stdPrices.reduce((a, b) => a.price > b.price ? a : b);
    const min = stdPrices.reduce((a, b) => a.price < b.price ? a : b);
    if (min.price > 0 && max.price / min.price > 1.5) {
      return { max, min, diff: Math.round((max.price / min.price - 1) * 100) };
    }
    return null;
  }, [rates]);

  // Calculator
  const calcResult = useMemo(() => {
    const weight = parseFloat(calcWeight);
    const price = parseFloat(calcPrice);
    if (isNaN(weight)) return null;

    const wh = DEMO_WAREHOUSE_ZONES.filter((z) => z.warehouseName === calcWarehouse && z.countryCode === calcCountry)[0] || warehouseZones.filter((z) => z.warehouseName === calcWarehouse && z.countryCode === calcCountry)[0];
    const rate = rates.find((r) => r.countryCode === calcCountry);

    let matchedRule: { label: string; price: number; currency: string } | null = null;
    if (wh?.rules.length) {
      for (const r of wh.rules) {
        if (r.type === "weight") {
          const range = r.label.match(/(\d+)-(\d+)/);
          if (range) { const lo = parseInt(range[1]), hi = parseInt(range[2]) || Infinity; if (weight >= lo && weight < hi) { matchedRule = r; break; } }
        }
      }
      if (!matchedRule) matchedRule = wh.rules[0];
    } else if (rate?.standard) {
      matchedRule = { label: rate.standard.name, price: rate.standard.price, currency: rate.standard.currency };
    }

    const cnyPrice = matchedRule ? toCny(matchedRule.price, matchedRule.currency) : null;
    const freeThreshold = rate?.freeThreshold;
    const triggersFree = !isNaN(price) && freeThreshold && price >= freeThreshold;

    return { matchedRule, cnyPrice, triggersFree, freeThreshold, diffToFree: !isNaN(price) && freeThreshold ? Math.max(0, freeThreshold - price) : 0 };
  }, [calcWeight, calcPrice, calcCountry, calcWarehouse, rates, warehouseZones]);

  return (
    <div className="space-y-4">
      {toast && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-success-border bg-success-bg px-4 py-2 text-sm font-medium text-success shadow-sm">{toast}</div>}

      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Truck className="h-5 w-5 text-muted-foreground" />运费管理</h2>
        <p className="mt-1 text-sm text-muted-foreground">{shopName}{isDemo && <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">(演示)</span>}</p>
      </div>

      {/* Rate difference alert */}
      {rateAnalysis && (
        <Card className="border-warning-border bg-warning-bg shadow-none"><CardContent className="flex items-start gap-2.5 p-3 text-[13px] leading-5 sm:items-center">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning sm:mt-0"/>
          <span className="text-warning">运费差异较大：{rateAnalysis.min.name} ¥{rateAnalysis.min.price.toFixed(2)} vs {rateAnalysis.max.name} ¥{rateAnalysis.max.price.toFixed(2)}，差异 {rateAnalysis.diff}%，建议优化仓储备货</span>
        </CardContent></Card>
      )}

      {rates.length === 0 && <div className="rounded-lg border border-border bg-card px-4 py-12 text-center sm:py-16"><Truck aria-hidden="true" className="mx-auto mb-3 h-10 w-10 text-muted-foreground"/><p className="text-sm leading-5 text-muted-foreground">暂未获取到运费数据，请在 Shopify Settings → Shipping 中配置</p></div>}

      {rates.length > 0 && (
        <>
          {/* Market selector */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="shipping-market" className="text-[13px] text-muted-foreground">市场</label>
            <select id="shipping-market" value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)} className="h-9 min-w-36 rounded-md border border-input bg-background px-2 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <option value="all">所有市场</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          {/* Rate Comparison Table */}
          <Card className="overflow-hidden border-border bg-card shadow-none">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-[13px] leading-5">
                  <thead><tr className="h-9 border-b border-border bg-muted text-xs font-medium text-muted-foreground">
                    <th scope="col" className="sticky left-0 min-w-36 bg-muted py-2 pl-3 text-left">运费规则</th>
                    {visibleRates.map((r) => <th scope="col" key={r.countryCode} className="min-w-[100px] px-3 py-2 text-right">{r.countryName}</th>)}
                  </tr></thead>
                  <tbody>
                    {([
                      { key: "freeThreshold", label: "免运费门槛", get: (r: CountryRate) => r.freeThreshold ? `${r.currency} ${r.freeThreshold}` : "—" },
                      { key: "standard", label: "标准运费", get: (r: CountryRate) => r.standard ? `${r.standard.currency} ${r.standard.price.toFixed(2)}` : <span className="text-destructive-text">未配置</span> },
                      { key: "express", label: "快递运费", get: (r: CountryRate) => r.express ? `${r.express.currency} ${r.express.price.toFixed(2)}` : <span className="text-muted-foreground">—</span> },
                      { key: "localPickup", label: "本地自提", get: (r: CountryRate) => r.localPickup ? <span className="text-success">✓ 支持</span> : "—" },
                    ] as const).map((row) => {
                      const values = visibleRates.map((r) => row.get(r));
                      return (
                        <tr key={row.key} className="h-11 border-b border-border last:border-0 hover:bg-accent">
                          <th scope="row" className="sticky left-0 bg-card py-2 pl-3 text-left font-medium text-foreground">{row.label}</th>
                          {values.map((v, i) => <td key={i} className="px-3 py-2 text-right tabular-nums text-foreground">{v}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Carrier Delivery Times */}
          <button type="button" aria-expanded={showWarehouse} onClick={() => setShowWarehouse(!showWarehouse)} className="flex min-h-9 items-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {showWarehouse ? <ChevronDown aria-hidden="true" className="h-4 w-4"/> : <ChevronRight aria-hidden="true" className="h-4 w-4"/>}物流商送达时效
          </button>
          {showWarehouse && (
            <Card className="overflow-hidden border-border bg-card shadow-none">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-[13px] leading-5">
                    <thead><tr className="h-9 border-b border-border bg-muted text-xs font-medium text-muted-foreground">
                      <th scope="col" className="sticky left-0 min-w-36 bg-muted py-2 pl-3 text-left">物流商</th>
                      {countries.map((c) => <th scope="col" key={c.code} className="min-w-[100px] px-3 py-2 text-right">{c.name}</th>)}
                    </tr></thead>
                    <tbody>
                      {carriers.map((ca) => (
                        <tr key={ca.name} className="h-11 border-b border-border last:border-0 hover:bg-accent">
                          <th scope="row" className="sticky left-0 bg-card py-2 pl-3 text-left font-normal"><Badge className="rounded-sm border border-border bg-muted px-1.5 py-0 text-xs font-medium text-muted-foreground">{ca.name}</Badge></th>
                          {countries.map((c) => <td key={c.code} className="px-3 py-2 text-right tabular-nums text-muted-foreground">{ca.countryTimes[c.code] || "—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </>
      )}

      {/* Shipping Calculator */}
      <button type="button" aria-expanded={showCalculator} onClick={() => setShowCalculator(!showCalculator)} className="flex min-h-9 items-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Calculator aria-hidden="true" className="h-4 w-4"/>{showCalculator ? <ChevronDown aria-hidden="true" className="h-4 w-4"/> : <ChevronRight aria-hidden="true" className="h-4 w-4"/>}运费计算器
      </button>
      {showCalculator && (
        <Card className="border-border bg-card shadow-none"><CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label htmlFor="shipping-weight" className="mb-1 block text-xs font-medium text-muted-foreground">商品重量 (g)</label><Input id="shipping-weight" type="number" value={calcWeight} onChange={(e)=>setCalcWeight(e.target.value)} className="h-9 text-[13px]"/></div>
            <div><label htmlFor="shipping-price" className="mb-1 block text-xs font-medium text-muted-foreground">商品价格</label><Input id="shipping-price" type="number" step="0.01" value={calcPrice} onChange={(e)=>setCalcPrice(e.target.value)} className="h-9 text-[13px]"/></div>
            <div><label htmlFor="shipping-country" className="mb-1 block text-xs font-medium text-muted-foreground">发往市场</label>
              <select id="shipping-country" value={calcCountry} onChange={(e)=>setCalcCountry(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">{countries.map((c)=><option key={c.code} value={c.code}>{c.name}</option>)}</select>
            </div>
            <div><label htmlFor="shipping-warehouse" className="mb-1 block text-xs font-medium text-muted-foreground">仓库</label>
              <select id="shipping-warehouse" value={calcWarehouse} onChange={(e)=>setCalcWarehouse(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {[...new Set(DEMO_WAREHOUSE_ZONES.map((z)=>z.warehouseName))].map((w)=><option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>
          {calcResult && (
            <div className="space-y-1 rounded-md border border-border bg-muted p-3 text-xs leading-5">
              <p className="text-muted-foreground">匹配规则: <span className="font-semibold text-foreground">{calcResult.matchedRule?.label || "—"}</span>{calcResult.matchedRule ? ` → ${calcResult.matchedRule.currency} ${calcResult.matchedRule.price}` : ""}</p>
              {calcResult.cnyPrice !== null && <p className="text-muted-foreground">预估运费: <span className="font-semibold text-foreground">{formatCny(calcResult.cnyPrice)}{calcResult.matchedRule && calcResult.matchedRule.currency !== "CNY" ? ` (约 ${calcResult.matchedRule.currency} ${calcResult.matchedRule.price})` : ""}</span></p>}
              {calcResult.triggersFree ? (
                <p className="text-success">✓ 已触发免运费门槛（{calcResult.freeThreshold} {rates.find((r)=>r.countryCode===calcCountry)?.currency}）</p>
              ) : calcResult.diffToFree > 0 ? (
                <p className="text-warning">还差 {calcResult.diffToFree} {rates.find((r)=>r.countryCode===calcCountry)?.currency} 触发免运费（门槛 {calcResult.freeThreshold}）</p>
              ) : null}
            </div>
          )}
        </CardContent></Card>
      )}
    </div>
  );
}
