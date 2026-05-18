"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <Card className="border-destructive/40">
        <CardContent className="space-y-3 py-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error.message || "An unexpected error occurred."}
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: <span className="font-mono">{error.digest}</span>
            </p>
          )}
          <Button onClick={reset} size="sm">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
