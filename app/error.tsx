"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bug, Home } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(function () {
    console.error("[app] Global Error Boundary caught:", error);
  }, [error]);

  return (
    <html lang="zh-CN" className="light">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive-bg ring-1 ring-destructive-border">
              <Bug className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="mb-3 text-xl font-bold text-foreground">系统遇到了意外错误</h1>
            <p className="mb-1 text-sm text-muted-foreground">{error.message || "应用运行时错误"}</p>
            {error.digest && (
              <p className="mb-6 font-mono text-xs text-muted-foreground">ID: {error.digest}</p>
            )}
            <div className="flex justify-center gap-3">
              <Button
                onClick={reset}
                className="h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Bug className="h-4 w-4" /> 重试
              </Button>
              <Button
                onClick={function () { window.location.href = "/dashboard"; }}
                variant="outline"
                className="h-10 gap-2"
              >
                <Home className="h-4 w-4" /> 返回首页
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
