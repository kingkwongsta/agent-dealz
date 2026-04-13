"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory, type SearchHistoryEntry } from "@/lib/api";

export function SearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Loading search history...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No searches yet. Try searching for a product above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
      <div className="rounded-lg border divide-y">
        {history.map((entry) => (
          <Link
            key={entry.search_id}
            href={`/search/${entry.search_id}`}
            className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="space-y-1">
              <p className="font-medium text-sm">{entry.query}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="text-right">
              {entry.best_price != null ? (
                <div>
                  <p className="font-mono font-semibold text-green-600 dark:text-green-400">
                    ${entry.best_price.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.best_retailer}</p>
                </div>
              ) : (
                <StatusDot status={entry.status} />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-blue-500",
    pending: "bg-yellow-500",
    failed: "bg-red-500",
    completed: "bg-green-500",
  };
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`w-2 h-2 rounded-full ${colors[status] || "bg-gray-400"}`} />
      {status}
    </div>
  );
}
