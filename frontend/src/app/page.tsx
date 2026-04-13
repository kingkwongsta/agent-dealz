"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchForm } from "@/components/SearchForm";
import { SearchHistory } from "@/components/SearchHistory";
import { ResultsTable } from "@/components/ResultsTable";
import { PriceChart } from "@/components/PriceChart";
import { AgentProgressLog } from "@/components/AgentProgressLog";
import { startSearch, getSearch, type SearchResponse } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollForResults = useCallback(
    async (searchId: string) => {
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const data = await getSearch(searchId);
          setSearchResult(data);
          if (data.status === "completed" || data.status === "failed") {
            setIsLoading(false);
            return;
          }
        } catch {
          // keep polling
        }
      }
      setIsLoading(false);
      setError("Search timed out. Please try again.");
    },
    []
  );

  const handleSearch = useCallback(
    async (query: string) => {
      setIsLoading(true);
      setError(null);
      setSearchResult(null);

      try {
        const { search_id } = await startSearch(query);
        setSearchResult({
          search_id,
          query,
          status: "running",
          created_at: new Date().toISOString(),
          completed_at: null,
          best_price: null,
          best_retailer: null,
          results: [],
        });
        pollForResults(search_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start search");
        setIsLoading(false);
      }
    },
    [pollForResults]
  );

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-4xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Agent Dealz</h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            AI-powered price research — find the best deal on any product across the web
          </p>
        </div>

        <div className="flex justify-center">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        {searchResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">
                  Results for &ldquo;{searchResult.query}&rdquo;
                </h2>
                <StatusBadge status={searchResult.status} />
              </div>
              {searchResult.status === "completed" && (
                <button
                  onClick={() => router.push(`/search/${searchResult.search_id}`)}
                  className="text-sm text-primary hover:underline underline-offset-4"
                >
                  Full details &rarr;
                </button>
              )}
            </div>

            {(searchResult.status === "running" || searchResult.status === "pending") && (
              <AgentProgressLog
                searchId={searchResult.search_id}
                onComplete={() => pollForResults(searchResult.search_id)}
              />
            )}

            {searchResult.status === "completed" && searchResult.best_price != null && (
              <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Best Price Found</p>
                  <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400">
                    ${searchResult.best_price.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">at</p>
                  <p className="text-lg font-semibold">{searchResult.best_retailer}</p>
                </div>
              </div>
            )}

            {searchResult.status === "completed" && (
              <>
                <PriceChart results={searchResult.results} />
                <ResultsTable results={searchResult.results} />
              </>
            )}

            {searchResult.status === "failed" && (
              <p className="text-destructive text-center py-8">
                Search failed. Please try again.
              </p>
            )}
          </div>
        )}

        {!searchResult && (
          <div className="pt-4">
            <SearchHistory />
          </div>
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
