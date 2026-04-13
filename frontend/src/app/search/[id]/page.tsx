"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getSearch, type SearchResponse } from "@/lib/api";
import { ResultsTable } from "@/components/ResultsTable";
import { PriceChart } from "@/components/PriceChart";

export default function SearchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [search, setSearch] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getSearch(id);
        if (cancelled) return;
        setSearch(data);

        if (data.status === "running" || data.status === "pending") {
          setTimeout(poll, 3000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load search");
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-4xl space-y-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to search
        </Link>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        {!search && !error && (
          <div className="flex items-center gap-3 text-muted-foreground py-16 justify-center">
            <Spinner />
            <span>Loading search results...</span>
          </div>
        )}

        {search && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{search.query}</h1>
                <StatusBadge status={search.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Searched {new Date(search.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {(search.status === "running" || search.status === "pending") && (
              <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
                <Spinner />
                <span>Agent is researching prices across retailers...</span>
              </div>
            )}

            {search.status === "completed" && search.best_price != null && (
              <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Best Price Found</p>
                  <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                    ${search.best_price.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">at</p>
                  <p className="text-lg font-semibold">{search.best_retailer}</p>
                </div>
              </div>
            )}

            {search.status === "completed" && (
              <>
                <PriceChart results={search.results} />
                <ResultsTable results={search.results} />
              </>
            )}

            {search.status === "failed" && (
              <p className="text-destructive text-center py-8">
                This search failed. Please try again from the home page.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[status] || ""}`}>
      {status}
    </span>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
