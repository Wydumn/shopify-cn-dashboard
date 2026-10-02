"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Key,
  History,
  Plus,
  Save,
  FolderOpen,
  Download,
  Pencil,
  ArrowRight,
  AlertTriangle,
  Check,
  X,
  Trash2,
  Edit3,
  Target,
  ListChecks,
  Link2,
  BarChart3,
  Lightbulb,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useDashboardMenu } from "../layout";
import {
  findOpportunityKeywords,
  checkKeywordCoverage,
  matchKeywordToProducts,
  estimateCompetition,
  type KeywordOpportunity,
  type KeywordCoverage,
  type KeywordProductMatch,
  type CompetitionEstimate,
} from "@/lib/keyword-research";

interface KeywordResearchPanelProps {
  isDemo: boolean;
  shopUrl: string;
  shopName: string;
  fullProducts?: any[];
  collections?: any[];
}

/* ─── 常量 ──────────────────────────────────────────── */

const KW_HISTORY_KEY = "kw_research_history";
const KW_SEED_LISTS_KEY = "kw_seed_lists";
const GSC_CACHE_KEY = "gsc_last_result";

interface SeedList {
  name: string;
  keywords: string[];
  note: string;
}

const PRESET_SEED_LISTS: SeedList[] = [
  {
    name: "电子产品",
    keywords: ["蓝牙耳机", "智能手表", "运动手环", "无线充电器", "移动电源", "数据线", "手机壳", "平板支架"],
    note: "消费电子高频词",
  },
  {
    name: "家居用品",
    keywords: ["台灯", "花瓶", "抱枕", "地毯", "收纳盒", "装饰画", "香薰", "床上用品"],
    note: "",
  },
  {
    name: "服饰配饰",
    keywords: ["T恤", "帽子", "背包", "围巾", "手表", "墨镜", "项链", "耳环"],
    note: "",
  },
  {
    name: "办公用品",
    keywords: ["键盘", "鼠标", "笔记本", "笔筒", "桌面收纳", "便签", "台历", "订书机"],
    note: "",
  },
];

/* ─── Demo 数据 ─────────────────────────────────────── */

const DEMO_PRODUCTS: any[] = [
  { id: 1, title: "降噪耳机 Pro 主动降噪蓝牙耳机", productType: "耳机", handle: "noise-cancelling-earbuds-pro" },
  { id: 2, title: "无线蓝牙耳机 运动防水版", productType: "耳机", handle: "wireless-sport-earbuds" },
  { id: 3, title: "游戏耳机 7.1声道", productType: "耳机", handle: "gaming-headset" },
  { id: 4, title: "智能手表 心率血氧监测", productType: "智能穿戴", handle: "smart-watch" },
  { id: 5, title: "运动手环 睡眠监测", productType: "智能穿戴", handle: "fitness-band" },
  { id: 6, title: "蓝牙音箱 便携重低音", productType: "音频", handle: "bluetooth-speaker" },
  { id: 7, title: "保温杯 316不锈钢 大容量", productType: "家居", handle: "vacuum-flask" },
  { id: 8, title: "机械键盘 客制化热插拔", productType: "电脑外设", handle: "mechanical-keyboard" },
  { id: 9, title: "无线充电器 快充底座", productType: "数码配件", handle: "wireless-charger" },
  { id: 10, title: "LED 护眼台灯 可调色温", productType: "家居", handle: "led-desk-lamp" },
  { id: 11, title: "加湿器 静音卧室", productType: "家居", handle: "humidifier" },
  { id: 12, title: "移动电源 20000mAh", productType: "数码配件", handle: "power-bank" },
  { id: 13, title: "智能台灯 语音控制", productType: "家居", handle: "smart-lamp" },
  { id: 14, title: "无线鼠标 人体工学", productType: "电脑外设", handle: "wireless-mouse" },
  { id: 15, title: "数据线 快充 Type-C", productType: "数码配件", handle: "usb-c-cable" },
  { id: 16, title: "颈椎按摩仪 颈椎热敷", productType: "健康", handle: "neck-massager" },
];

const DEMO_GSC_ROWS: any[] = [
  { query: "降噪耳机", impressions: 12500, clicks: 680, ctr: 0.054, position: 8.2, positionDelta: -1.2 },
  { query: "无线耳机", impressions: 9800, clicks: 540, ctr: 0.055, position: 9.1, positionDelta: 0.8 },
  { query: "降噪耳机 pro", impressions: 8200, clicks: 90, ctr: 0.011, position: 6.8, positionDelta: -0.5 },
  { query: "蓝牙耳机 推荐", impressions: 6400, clicks: 70, ctr: 0.011, position: 7.5, positionDelta: 0.3 },
  { query: "智能手表", impressions: 8200, clicks: 320, ctr: 0.039, position: 12.5, positionDelta: 6.1 },
  { query: "运动手环", impressions: 5400, clicks: 180, ctr: 0.033, position: 11.2, positionDelta: 1.1 },
  { query: "蓝牙音箱", impressions: 7600, clicks: 410, ctr: 0.054, position: 7.3, positionDelta: -0.5 },
  { query: "保温杯", impressions: 6900, clicks: 290, ctr: 0.042, position: 10.4, positionDelta: -1.8 },
  { query: "机械键盘", impressions: 5100, clicks: 130, ctr: 0.025, position: 13.6, positionDelta: 3.2 },
  { query: "无线充电器", impressions: 5400, clicks: 230, ctr: 0.043, position: 11.2, positionDelta: 1.1 },
  { query: "led 台灯", impressions: 4200, clicks: 85, ctr: 0.02, position: 10.2, positionDelta: -1.4 },
  { query: "护眼台灯", impressions: 3800, clicks: 60, ctr: 0.016, position: 9.8, positionDelta: -0.9 },
  { query: "加湿器", impressions: 3200, clicks: 40, ctr: 0.013, position: 14.8, positionDelta: 0.9 },
  { query: "移动电源", impressions: 4500, clicks: 150, ctr: 0.033, position: 12.1, positionDelta: -1.0 },
  { query: "无线鼠标", impressions: 2800, clicks: 130, ctr: 0.046, position: 9.4, positionDelta: 1.5 },
  { query: "数据线", impressions: 2600, clicks: 95, ctr: 0.037, position: 13.1, positionDelta: 4.1 },
  { query: "颈椎按摩仪", impressions: 3500, clicks: 120, ctr: 0.034, position: 16.3, positionDelta: 0.6 },
  { query: "智能台灯", impressions: 2400, clicks: 110, ctr: 0.046, position: 10.2, positionDelta: -1.4 },
  { query: "游戏耳机", impressions: 2600, clicks: 90, ctr: 0.035, position: 13.1, positionDelta: 4.1 },
  { query: "保温杯 大容量", impressions: 1800, clicks: 30, ctr: 0.017, position: 11.5, positionDelta: -0.3 },
  { query: "demo 旗舰店 优惠券", impressions: 1400, clicks: 420, ctr: 0.3, position: 4.8, positionDelta: -0.1, isBrand: true },
  { query: "demo 耳机", impressions: 1500, clicks: 380, ctr: 0.253, position: 6.1, positionDelta: -0.2, isBrand: true },
  { query: "降噪耳塞", impressions: 1000, clicks: 25, ctr: 0.025, position: 14.5, positionDelta: 1.0 },
  { query: "蓝牙音箱 重低音", impressions: 2000, clicks: 45, ctr: 0.023, position: 12.8, positionDelta: 2.7 },
  { query: "便携榨汁机", impressions: 1200, clicks: 30, ctr: 0.025, position: 12.1, positionDelta: -1.0 },
];

/* ─── 工具函数 ─────────────────────────────────────── */

function parseKeywordList(input: string): string[] {
  if (!input) return [];
  return input
    .split(/[\n,，;；]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function readGSCRows(): any[] {
  try {
    const raw = localStorage.getItem(GSC_CACHE_KEY);
    if (!raw) return [];
    const obj = JSON.parse(raw);
    if (obj && Array.isArray(obj.rows)) return obj.rows;
  } catch {
    /* ignore */
  }
  return [];
}

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(KW_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
  } catch {
    /* ignore */
  }
  return [];
}

function loadUserSeedLists(): SeedList[] {
  try {
    const raw = localStorage.getItem(KW_SEED_LISTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr
        .filter((x) => x && typeof x.name === "string" && Array.isArray(x.keywords))
        .map((x) => ({ name: x.name, keywords: x.keywords, note: x.note || "" }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

function saveUserSeedLists(lists: SeedList[]): void {
  try {
    localStorage.setItem(KW_SEED_LISTS_KEY, JSON.stringify(lists.slice(0, 10)));
  } catch {
    /* ignore */
  }
}

function csvCell(v: any): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadText(filename: string, content: string, mime: string): void {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    /* ignore */
  }
}

/* ─── 子组件 ───────────────────────────────────────── */

function KwCell({ text }: { text: string }) {
  return (
    <div className="max-w-[200px] truncate" title={text}>
      {text}
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card shadow-popover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_META: Record<
  KeywordCoverage["status"],
  { label: string; cls: string }
> = {
  covered: { label: "已覆盖", cls: "border-success-border bg-success-bg text-success" },
  no_title_match: { label: "无标题匹配", cls: "border-warning-border bg-warning-bg text-warning" },
  no_search_data: { label: "无搜索数据", cls: "border-warning-border bg-warning-bg text-warning" },
  uncovered: { label: "完全未覆盖", cls: "border-destructive-border bg-destructive-bg text-destructive-text" },
};

const PRIORITY_META: Record<CompetitionEstimate["priority"], { label: string; cls: string }> = {
  P0: { label: "P0", cls: "border-destructive-border bg-destructive-bg text-destructive-text" },
  P1: { label: "P1", cls: "border-warning-border bg-warning-bg text-warning" },
  P2: { label: "P2", cls: "border-info-border bg-info-bg text-info" },
};

/* ─── 主组件 ───────────────────────────────────────── */

export default function KeywordResearchPanel({
  isDemo,
  shopUrl,
  shopName,
  fullProducts,
  collections,
}: KeywordResearchPanelProps) {
  const { setActiveMenu } = useDashboardMenu();

  const products = useMemo(
    () => (isDemo ? DEMO_PRODUCTS : fullProducts || []),
    [isDemo, fullProducts],
  );
  const collectionsData = useMemo(
    () => (isDemo ? [] : collections || []),
    [isDemo, collections],
  );

  const gscRows = useMemo<any[]>(() => {
    if (isDemo) return DEMO_GSC_ROWS;
    return readGSCRows();
  }, [isDemo]);
  const gscAvailable = gscRows.length > 0;

  const [seedInput, setSeedInput] = useState<string>(
    isDemo ? "蓝牙耳机, 智能手表, 运动手环, 无线充电器, 移动电源, 数据线, 台灯, 保温杯" : "",
  );
  const [analyzed, setAnalyzed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "opportunity" | "coverage" | "association" | "competition"
  >("opportunity");
  const [history, setHistory] = useState<string[]>(() => loadHistory());

  const [oppMinImp, setOppMinImp] = useState<number>(500);
  const [oppMaxCtrPct, setOppMaxCtrPct] = useState<number>(3);

  const [coverageInput, setCoverageInput] = useState<string>(
    isDemo ? "降噪耳机, 蓝牙耳机 推荐, 数据线 快充, 入耳式监听" : "",
  );
  const [assocInput, setAssocInput] = useState<string>(isDemo ? "降噪耳机" : "");

  const [seedList, setSeedList] = useState<string[]>([]);

  // 种子词列表管理
  const [userSeedLists, setUserSeedLists] = useState<SeedList[]>(() =>
    loadUserSeedLists(),
  );
  const [seedModalOpen, setSeedModalOpen] = useState<boolean>(false);
  const [seedFormName, setSeedFormName] = useState<string>("");
  const [seedFormText, setSeedFormText] = useState<string>("");
  const [seedFormNote, setSeedFormNote] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // 快捷种子词（TOP5 品类）
  const quickSeeds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      const t = (p?.productType || "").trim();
      if (t) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((e) => e[0]);
  }, [products]);

  // Demo 模式自动跑一次分析，让四个 Tab 直接有数据
  useEffect(() => {
    if (isDemo && !analyzed) {
      const list = parseKeywordList(seedInput);
      setSeedList(list);
      setAnalyzed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  /* ─── 计算 ─────────────────────────────────────── */

  const opportunities = useMemo<KeywordOpportunity[]>(() => {
    if (!gscAvailable) return [];
    return findOpportunityKeywords(
      gscRows,
      oppMinImp,
      oppMaxCtrPct / 100,
      products,
    );
  }, [gscAvailable, gscRows, oppMinImp, oppMaxCtrPct, products]);

  const coverageKeywords = useMemo(
    () => parseKeywordList(coverageInput),
    [coverageInput],
  );
  const coverageResults = useMemo<KeywordCoverage[]>(() => {
    if (coverageKeywords.length === 0) return [];
    return checkKeywordCoverage(coverageKeywords, products, gscRows);
  }, [coverageKeywords, products, gscRows]);

  const assocResults = useMemo<KeywordProductMatch[]>(() => {
    const kw = assocInput.trim();
    if (!kw) return [];
    return matchKeywordToProducts(kw, gscRows, products, collectionsData);
  }, [assocInput, gscRows, products, collectionsData]);

  const competitionResults = useMemo<CompetitionEstimate[]>(() => {
    if (seedList.length === 0) return [];
    return estimateCompetition(seedList, gscRows, products);
  }, [seedList, gscRows, products]);

  /* ─── 行为 ─────────────────────────────────────── */

  const openProductEdit = useCallback(
    (productId: number, tab: "basic" | "seo" | "images") => {
      try {
        localStorage.setItem(
          "pc_edit_request",
          JSON.stringify({ productId, tab }),
        );
      } catch {
        /* ignore */
      }
      try {
        window.dispatchEvent(new CustomEvent("pc-edit-request"));
      } catch {
        /* ignore */
      }
      setActiveMenu("product-control");
    },
    [setActiveMenu],
  );

  const handleAnalyze = useCallback(() => {
    const list = parseKeywordList(seedInput);
    setSeedList(list);
    setAnalyzed(true);
    const trimmed = seedInput.trim();
    if (trimmed) {
      setHistory((prev) => {
        const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 10);
        try {
          localStorage.setItem(KW_HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }
  }, [seedInput]);

  const exportCsv = useCallback(() => {
    const lines: string[] = [];
    lines.push("﻿关键词研究报告");
    lines.push(`店铺,${csvCell(shopName)}`);
    lines.push(`生成时间,${csvCell(new Date().toLocaleString())}`);
    lines.push("");
    lines.push("== 机会关键词（高曝光 + 低 CTR） ==");
    lines.push("关键词,曝光次数,点击次数,CTR,平均排名,对应页面,优化建议,匹配商品数");
    for (const o of opportunities) {
      lines.push(
        [
          o.keyword,
          o.impressions,
          o.clicks,
          (o.ctr * 100).toFixed(2) + "%",
          o.position.toFixed(1),
          o.landingPage,
          o.suggestion,
          o.matchedProductIds.length,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    lines.push("");
    lines.push("== 关键词覆盖检查 ==");
    lines.push("目标关键词,GSC有数据,GSC曝光,标题覆盖,匹配商品,状态,建议");
    for (const c of coverageResults) {
      lines.push(
        [
          c.keyword,
          c.hasGSCData ? "是" : "否",
          c.gscImpressions,
          c.matchedInTitles ? `是(${c.matchedProducts.length}件)` : "否",
          c.matchedProducts.map((p) => p.title).join(" / "),
          c.status,
          c.suggestion,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    lines.push("");
    lines.push("== 关键词→商品关联 ==");
    lines.push(`搜索词,${csvCell(assocInput)}`);
    lines.push("落地页,曝光,CTR,匹配商品,关联度");
    for (const m of assocResults) {
      lines.push(
        [
          m.landingPage,
          m.impressions,
          (m.ctr * 100).toFixed(2) + "%",
          m.matchedProduct ? m.matchedProduct.title : "-",
          m.matchStrength,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    lines.push("");
    lines.push("== 竞争度估算 ==");
    lines.push("关键词,搜索量级,竞争度,竞争度等级,机会分数,优先级");
    for (const e of competitionResults) {
      lines.push(
        [
          e.keyword,
          e.searchVolume,
          e.competition,
          e.competitionLabel,
          e.opportunityScore,
          e.priority,
        ]
          .map(csvCell)
          .join(","),
      );
    }
    downloadText(
      `关键词研究报告_${shopName || "store"}_${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n"),
      "text/csv;charset=utf-8",
    );
  }, [opportunities, coverageResults, assocResults, competitionResults, assocInput, shopName]);

  /* ─── 种子词列表管理 ───────────────────────────── */

  const openSeedModal = useCallback(
    (index: number | null) => {
      if (index === null) {
        setSeedFormName("");
        setSeedFormText(seedInput);
        setSeedFormNote("");
        setEditingIndex(null);
      } else {
        const sl = userSeedLists[index];
        setSeedFormName(sl.name);
        setSeedFormText(sl.keywords.join("\n"));
        setSeedFormNote(sl.note);
        setEditingIndex(index);
      }
      setSeedModalOpen(true);
    },
    [seedInput, userSeedLists],
  );

  const saveSeedForm = useCallback(() => {
    const name = seedFormName.trim();
    const kws = parseKeywordList(seedFormText);
    if (!name) return;
    if (kws.length === 0) return;
    setUserSeedLists((prev) => {
      let next: SeedList[];
      if (editingIndex !== null && prev[editingIndex]) {
        next = prev.slice();
        next[editingIndex] = { name, keywords: kws, note: seedFormNote.trim() };
      } else {
        next = [...prev, { name, keywords: kws, note: seedFormNote.trim() }];
        if (next.length > 10) next = next.slice(next.length - 10);
      }
      saveUserSeedLists(next);
      return next;
    });
    setSeedModalOpen(false);
  }, [seedFormName, seedFormText, seedFormNote, editingIndex]);

  const deleteUserSeedList = useCallback(
    (index: number) => {
      setUserSeedLists((prev) => {
        const next = prev.filter((_, i) => i !== index);
        saveUserSeedLists(next);
        return next;
      });
    },
    [],
  );

  const allSeedLists = useMemo(
    () => [...PRESET_SEED_LISTS, ...userSeedLists],
    [userSeedLists],
  );

  const loadSeedList = useCallback(
    (indexStr: string) => {
      const idx = Number(indexStr);
      const sl = allSeedLists[idx];
      if (sl) setSeedInput(sl.keywords.join("\n"));
    },
    [allSeedLists],
  );

  /* ─── 渲染 ─────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* 配置横幅：真实模式且无 GSC 缓存 */}
      {!isDemo && !gscAvailable && (
        <div className="flex items-center gap-3 rounded-lg border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">
            尚未配置 Google Search Console，部分分析功能（机会/关联/竞争度）不可用。
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-warning-border text-warning hover:bg-warning-bg"
            onClick={() => setActiveMenu("search-console")}
          >
            去配置 →
          </Button>
        </div>
      )}

      {/* 顶部搜索栏 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-4 text-success" />
            关键词机会发现与缺口分析
          </CardTitle>
          <CardDescription>
            结合 GSC 搜索数据与店铺商品数据，找出最值得优化的搜索词。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
              placeholder="输入一个品类词或种子关键词，如 蓝牙耳机"
              className="min-w-[260px] flex-1"
            />
            <Button
              onClick={handleAnalyze}
            >
              <Search className="size-4" />
              分析
            </Button>
            {history.length > 0 && (
              <Select onValueChange={(v) => setSeedInput(v as string)}>
                <SelectTrigger className="w-[140px]" size="sm">
                  <History className="size-4" />
                  <SelectValue placeholder="搜索历史" />
                </SelectTrigger>
                <SelectContent>
                  {history.map((h, i) => (
                    <SelectItem key={i} value={h}>
                      {h.length > 18 ? h.slice(0, 18) + "…" : h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {quickSeeds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">快捷种子词：</span>
              {quickSeeds.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setSeedInput(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 批量工具栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={exportCsv}
          disabled={!analyzed}
        >
          <Download className="size-4" />
          导出关键词分析报告 CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => openSeedModal(null)}
        >
          <Save className="size-4" />
          保存当前种子词列表
        </Button>
        {allSeedLists.length > 0 && (
          <Select onValueChange={(v) => loadSeedList(v as string)}>
            <SelectTrigger className="h-8 w-[160px]" size="sm">
              <FolderOpen className="size-4" />
              <SelectValue placeholder="加载已保存列表" />
            </SelectTrigger>
            <SelectContent>
              {allSeedLists.map((sl, i) => (
                <SelectItem key={i} value={String(i)}>
                  {sl.name}
                  {i < PRESET_SEED_LISTS.length ? "（预置）" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 分析结果 */}
      {!analyzed ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            输入种子关键词后点击「分析」，查看机会关键词、覆盖检查、关键词→商品关联与竞争度估算。
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "opportunity" | "coverage" | "association" | "competition")
          }
        >
          <TabsList className="flex-wrap">
            <TabsTrigger value="opportunity">
              <Target className="size-4" />
              机会关键词
            </TabsTrigger>
            <TabsTrigger value="coverage">
              <ListChecks className="size-4" />
              关键词覆盖检查
            </TabsTrigger>
            <TabsTrigger value="association">
              <Link2 className="size-4" />
              关键词→商品关联
            </TabsTrigger>
            <TabsTrigger value="competition">
              <BarChart3 className="size-4" />
              竞争度估算
            </TabsTrigger>
          </TabsList>

          {/* Tab 1：机会关键词 */}
          <TabsContent value="opportunity">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">机会关键词</CardTitle>
                <CardDescription>
                  高曝光 + 低 CTR + 排名前 20 的查询词，优先优化其页面 Title / Description。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs text-muted-foreground">
                    最小曝光数
                    <Input
                      type="number"
                      value={oppMinImp}
                      onChange={(e) => setOppMinImp(Number(e.target.value) || 0)}
                      className="mt-1 h-8 w-28"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    CTR 上限 (%)
                    <Input
                      type="number"
                      value={oppMaxCtrPct}
                      onChange={(e) => setOppMaxCtrPct(Number(e.target.value) || 0)}
                      className="mt-1 h-8 w-28"
                    />
                  </label>
                </div>

                {opportunities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {gscAvailable
                      ? "当前筛选条件下没有机会关键词，可放宽曝光/CTR 阈值。"
                      : "无 GSC 数据，无法分析机会关键词。"}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-muted-foreground">关键词</TableHead>
                          <TableHead className="text-right text-muted-foreground">曝光次数</TableHead>
                          <TableHead className="text-right text-muted-foreground">CTR</TableHead>
                          <TableHead className="text-right text-muted-foreground">排名</TableHead>
                          <TableHead className="text-muted-foreground">对应页面</TableHead>
                          <TableHead className="text-muted-foreground">优化建议</TableHead>
                          <TableHead className="text-right text-muted-foreground">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {opportunities.map((o) => (
                          <TableRow key={o.keyword} className="hover:bg-muted/40">
                            <TableCell className="font-medium text-foreground">
                              <KwCell text={o.keyword} />
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              {o.impressions.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              <span className="text-destructive-text">
                                {(o.ctr * 100).toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-foreground">
                              {o.position.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{o.landingPage}</TableCell>
                            <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                              {o.suggestion}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                className="h-7"
                                disabled={o.matchedProductIds.length === 0}
                                onClick={() =>
                                  openProductEdit(o.matchedProductIds[0], "seo")
                                }
                              >
                                <Pencil className="size-3.5" />
                                优化
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2：关键词覆盖检查 */}
          <TabsContent value="coverage">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">关键词覆盖检查</CardTitle>
                <CardDescription>
                  每行一个关键词（或逗号分隔），对比 GSC 搜索数据与商品标题覆盖情况。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={coverageInput}
                  onChange={(e) => setCoverageInput(e.target.value)}
                  placeholder="降噪耳机, 无线运动耳机, 高保真音响, 入耳式监听"
                  className="h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-success"
                />
                {coverageResults.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    输入目标关键词后自动检查覆盖情况。
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-muted-foreground">目标关键词</TableHead>
                          <TableHead className="text-muted-foreground">GSC 有数据</TableHead>
                          <TableHead className="text-right text-muted-foreground">GSC 曝光</TableHead>
                          <TableHead className="text-muted-foreground">标题覆盖</TableHead>
                          <TableHead className="text-muted-foreground">状态</TableHead>
                          <TableHead className="text-muted-foreground">建议</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coverageResults.map((c) => {
                          const meta = STATUS_META[c.status];
                          return (
                            <TableRow key={c.keyword} className="hover:bg-muted/40">
                              <TableCell className="font-medium text-foreground">
                                <KwCell text={c.keyword} />
                              </TableCell>
                              <TableCell>
                                {c.hasGSCData ? (
                                  <span className="inline-flex items-center gap-1 text-success">
                                    <Check className="size-3.5" />
                                    {c.gscImpressions.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-foreground">
                                {c.gscImpressions.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {c.matchedInTitles ? (
                                  <span className="text-info" title={c.matchedProducts.map((p) => p.title).join(" / ")}>
                                    {c.matchedProducts.length} 件
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={`h-5 border px-1.5 text-[11px] font-medium ${meta.cls}`}>{meta.label}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                                {c.suggestion}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3：关键词→商品关联 */}
          <TabsContent value="association">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">关键词→商品关联</CardTitle>
                <CardDescription>
                  输入一个搜索词，查看其 GSC 落地页与店铺商品的关联强度。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={assocInput}
                    onChange={(e) => setAssocInput(e.target.value)}
                    placeholder="输入一个搜索词，如 无线降噪耳机"
                    className="min-w-[240px] flex-1"
                  />
                </div>

                {assocResults.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    输入搜索词后自动匹配关联商品。
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-foreground">
                      搜索词：
                      <span className="font-medium text-foreground">「{assocInput}」</span>
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-muted-foreground">GSC 落地页</TableHead>
                            <TableHead className="text-right text-muted-foreground">曝光</TableHead>
                            <TableHead className="text-right text-muted-foreground">CTR</TableHead>
                            <TableHead className="text-muted-foreground">匹配商品</TableHead>
                            <TableHead className="text-muted-foreground">关联度</TableHead>
                            <TableHead className="text-right text-muted-foreground">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assocResults.map((m, i) => {
                            const strengthMeta =
                              m.matchStrength === "strong"
                                ? { label: "强关联", cls: "border-success-border bg-success-bg text-success" }
                                : m.matchStrength === "weak"
                                  ? { label: "无明确商品关联", cls: "border-warning-border bg-warning-bg text-warning" }
                                  : { label: "无关联", cls: "border-destructive-border bg-destructive-bg text-destructive-text" };
                            return (
                              <TableRow key={i} className="hover:bg-muted/40">
                                <TableCell className="font-mono text-xs text-foreground">
                                  <KwCell text={m.landingPage} />
                                </TableCell>
                                <TableCell className="text-right text-foreground">
                                  {m.impressions.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right text-foreground">
                                  {(m.ctr * 100).toFixed(1)}%
                                </TableCell>
                                <TableCell className="text-foreground">
                                  {m.matchedProduct ? (
                                    <KwCell text={m.matchedProduct.title} />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={`h-5 border px-1.5 text-[11px] font-medium ${strengthMeta.cls}`}>
                                    {strengthMeta.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {m.matchedProduct && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() =>
                                        openProductEdit(m.matchedProduct.id, "seo")
                                      }
                                    >
                                      <ArrowRight className="size-3.5" />
                                      查看
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4：竞争度估算 */}
          <TabsContent value="competition">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">竞争度估算</CardTitle>
                <CardDescription>
                  基于 GSC 数据推断搜索量级与竞争度，给出机会分数与推荐优先级（TOP 10 优先优化）。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {competitionResults.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    先点击「分析」输入种子关键词，或加载已保存的种子词列表。
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-muted-foreground">关键词</TableHead>
                          <TableHead className="text-right text-muted-foreground">搜索量级</TableHead>
                          <TableHead className="text-right text-muted-foreground">竞争度</TableHead>
                          <TableHead className="text-right text-muted-foreground">机会分数</TableHead>
                          <TableHead className="text-muted-foreground">优先级</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competitionResults.map((e) => {
                          const pm = PRIORITY_META[e.priority];
                          return (
                            <TableRow key={e.keyword} className="hover:bg-muted/40">
                              <TableCell className="font-medium text-foreground">
                                <KwCell text={e.keyword} />
                              </TableCell>
                              <TableCell className="text-right text-foreground">
                                {e.searchVolume}
                              </TableCell>
                              <TableCell className="text-right text-foreground">
                                {e.competition}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({e.competitionLabel})
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-foreground">
                                {e.opportunityScore}
                              </TableCell>
                              <TableCell>
                                <Badge className={`h-5 border px-1.5 text-[11px] font-medium ${pm.cls}`}>{pm.label}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 种子词列表管理弹窗 */}
      <Modal
        open={seedModalOpen}
        onClose={() => setSeedModalOpen(false)}
        title="种子词列表管理"
        footer={
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setSeedModalOpen(false)}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="h-8"
              onClick={saveSeedForm}
              disabled={!seedFormName.trim() || parseKeywordList(seedFormText).length === 0}
            >
              <Save className="size-4" />
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">列表名</label>
            <Input
              value={seedFormName}
              onChange={(e) => setSeedFormName(e.target.value)}
              placeholder="如：冬季促销词"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">关键词（每行一个，支持中英文逗号分隔）</label>
            <textarea
              value={seedFormText}
              onChange={(e) => setSeedFormText(e.target.value)}
              className="mt-1 h-40 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-success"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">备注（可选）</label>
            <textarea
              value={seedFormNote}
              onChange={(e) => setSeedFormNote(e.target.value)}
              className="mt-1 h-16 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-success"
            />
          </div>

          {/* 已保存列表 */}
          {allSeedLists.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">已保存列表（最多 10 个，预置列表不可删除）</p>
              {allSeedLists.map((sl, i) => {
                const isPreset = i < PRESET_SEED_LISTS.length;
                const userIdx = isPreset ? -1 : i - PRESET_SEED_LISTS.length;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {sl.name}
                        {isPreset && (
                          <span className="ml-2 text-xs text-muted-foreground">（预置）</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sl.keywords.length} 个词
                        {sl.note ? ` · ${sl.note}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSeedInput(sl.keywords.join("\n"));
                        setSeedModalOpen(false);
                      }}
                    >
                      <FolderOpen className="size-3.5" />
                      加载
                    </Button>
                    {!isPreset && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => openSeedModal(userIdx)}
                        >
                          <Edit3 className="size-3.5" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive-text hover:bg-destructive-bg"
                          onClick={() => deleteUserSeedList(userIdx)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => openSeedModal(null)}
            >
              <Plus className="size-4" />
              新建列表
            </Button>
          </div>

          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lightbulb className="size-3.5" />
            预置列表开箱即用；自定义列表保存在浏览器 localStorage（key: kw_seed_lists）。
          </p>
        </div>
      </Modal>
    </div>
  );
}
