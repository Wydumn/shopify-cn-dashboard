"use client";

import { Sparkles, Brain, Bot, Lightbulb, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface DiagnosisReport {
  overview: string;
  conversionAnalysis: string;
  inventoryAlerts: string[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high";
}

function cleanHeading(line: string): string {
  return line.replace(/^##+\s*/, "").replace(/^(?:🔴|🟡|🟢|⚠️|✅|❌|🚨|🔥|💡|📦|📈|💰|🎯)\s*/, "");
}

interface DiagnosisReportViewProps {
  diagnosing: boolean;
  diagnosis: DiagnosisReport | null;
  typewriterText: string;
  diagnosisError?: string | null;
  shopName: string;
  isDemo?: boolean;
  onStart: () => void;
}

export default function DiagnosisReportView({
  diagnosing,
  diagnosis,
  typewriterText,
  diagnosisError,
  shopName,
  isDemo,
  onStart,
}: DiagnosisReportViewProps) {
  return (
    <div className="space-y-6">
      {diagnosisError && (
        <div className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3">
          <p className="text-[13px] leading-relaxed text-foreground">{diagnosisError}</p>
        </div>
      )}

      {!diagnosing && !diagnosis && (
        <div className="flex flex-col items-center gap-6 py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-muted">
            <Brain className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-base font-medium text-foreground">准备分析 {shopName}</p>
          <Button size="lg" onClick={onStart} className="gap-2">
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />开始诊断
          </Button>
          {!isDemo && (
            <div className="mt-4 w-full rounded-lg border border-border/30 bg-muted/30 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" />想要真正的 AI 实时诊断？
              </p>
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground/70">{"// .env.local\nDEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx"}</pre>
            </div>
          )}
        </div>
      )}

      {diagnosing && (
        <div className="flex flex-col items-center gap-5 py-16">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
            <Bot className="relative h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-base font-medium text-foreground">{typewriterText}</p>
        </div>
      )}

      {!diagnosing && diagnosis && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">风险等级：</span>
            <Badge
              variant="outline"
              className={
                diagnosis.riskLevel === "high"
                  ? "border-destructive-border bg-destructive-bg text-destructive-text"
                  : diagnosis.riskLevel === "medium"
                    ? "border-warning-border bg-warning-bg text-warning"
                    : "border-success-border bg-success-bg text-success"
              }
            >
              {diagnosis.riskLevel === "high" ? "高风险" : diagnosis.riskLevel === "medium" ? "中等风险" : "低风险"}
            </Badge>
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            {diagnosis.overview.split("\n").map((l, i) =>
              l.startsWith("## ") ? (
                <h3 key={i} className="mb-2 text-base font-semibold text-foreground">{cleanHeading(l)}</h3>
              ) : (
                <p key={i} className="my-1 text-sm text-muted-foreground">{cleanHeading(l)}</p>
              ),
            )}
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            {diagnosis.conversionAnalysis.split("\n").map((l, i) =>
              l.startsWith("## ") ? (
                <h3 key={i} className="mb-2 text-base font-semibold text-foreground">{cleanHeading(l)}</h3>
              ) : (
                <p key={i} className="my-1 text-sm text-muted-foreground">{cleanHeading(l)}</p>
              ),
            )}
          </div>
          {diagnosis.inventoryAlerts.map((a, i) => {
            const severity = a.startsWith("## 🔴")
              ? "high"
              : a.startsWith("## 🟡")
                ? "warning"
                : a.startsWith("## 🟢")
                  ? "low"
                  : "info";
            const severityStyle = severity === "high"
              ? "border-destructive-border bg-destructive-bg text-destructive-text"
              : severity === "warning"
                ? "border-warning-border bg-warning-bg text-warning"
                : severity === "low"
                  ? "border-success-border bg-success-bg text-success"
                  : "border-info-border bg-info-bg text-info";
            const SeverityIcon = severity === "high" || severity === "warning"
              ? AlertTriangle
              : severity === "low"
                ? CheckCircle2
                : Info;
            const severityLabel = severity === "high"
              ? "高风险"
              : severity === "warning"
                ? "需关注"
                : severity === "low"
                  ? "正常"
                  : "信息";
            return (
              <div key={i} className={`rounded-md border p-4 ${severityStyle}`}>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <SeverityIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{severityLabel}</span>
                </div>
                {a.split("\n").map((l, j) =>
                  l.startsWith("## ") ? (
                    <h3 key={j} className="mb-2 text-base font-semibold text-foreground">{cleanHeading(l)}</h3>
                  ) : l.startsWith("> ") ? (
                    <p key={j} className="my-1 border-l-2 border-current pl-3 text-sm italic text-muted-foreground">{cleanHeading(l.slice(2))}</p>
                  ) : l ? (
                    <p key={j} className="my-1 text-sm text-muted-foreground">{cleanHeading(l)}</p>
                  ) : null,
                )}
              </div>
            );
          })}
          <div className="rounded-md border border-border bg-muted p-4">
            {diagnosis.recommendations.map((r, i) => (
              <div key={i} className="mb-4 last:mb-0">
                {r.split("\n").map((l, j) =>
                  l.startsWith("## ") ? (
                    <h3 key={j} className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">{cleanHeading(l)}</h3>
                  ) : l.startsWith("### ") ? (
                    <h4 key={j} className="mb-1 mt-2 text-sm font-medium text-foreground">{cleanHeading(l)}</h4>
                  ) : l.startsWith("> ") ? (
                    <p key={j} className="my-1 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">{cleanHeading(l.slice(2))}</p>
                  ) : (
                    <p key={j} className="my-1 text-sm text-muted-foreground">{cleanHeading(l)}</p>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
