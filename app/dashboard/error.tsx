"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(function () {
    console.error("[dashboard] Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md px-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive-bg ring-1 ring-destructive-border">
          <AlertTriangle className="h-9 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">面板出了点问题</h2>
        <p className="mb-2 text-base text-muted-foreground">{error.message || "未知运行时错误"}</p>
        {error.digest && (
          <p className="mb-4 font-mono text-sm text-muted-foreground">Error ID: {error.digest}</p>
        )}
        <div className="flex justify-center gap-3">
          <Button
            onClick={reset}
            className="h-9 bg-primary text-primary-foreground text-base hover:bg-primary/90"
          >
            重试
          </Button>
          <Button
            onClick={function () { window.location.href = "/dashboard"; }}
            variant="outline"
            className="h-9 text-base"
          >
            返回看板
          </Button>
        </div>
      </div>
    </div>
  );
}
