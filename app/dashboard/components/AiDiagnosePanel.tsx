"use client";

import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import DiagnosisReportView, { type DiagnosisReport } from "./DiagnosisReportView";

interface AiDiagnosePanelProps {
  diagnosing: boolean;
  diagnosis: DiagnosisReport | null;
  typewriterText: string;
  diagnosisError?: string | null;
  shopName: string;
  isDemo?: boolean;
  onStart: () => void;
}

export default function AiDiagnosePanel(props: AiDiagnosePanelProps) {
  const { isDemo } = props;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">AI 跨境操盘手智能诊断</h1>
          <p className="text-[13px] text-muted-foreground">
            {isDemo ? "演示模式 · 本地高保真预设" : "基于今日全站数据 · DeepSeek"}
          </p>
        </div>
      </header>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <DiagnosisReportView {...props} />
        </CardContent>
      </Card>
    </div>
  );
}
