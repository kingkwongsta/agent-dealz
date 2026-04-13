"use client";

import { useState, useCallback } from "react";
import { SearchForm } from "@/components/SearchForm";
import { startSearch, getSearch, type SearchResponse } from "@/lib/api";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollForResults = useCallback(async (searchId: string) => {
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
  }, []);

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
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Agent Dealz</h1>
          <p className="text-muted-foreground text-lg">
            AI-powered price research — find the best deal on any product
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
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">
                Results for &ldquo;{searchResult.query}&rdquo;
              </h2>
              <StatusBadge status={searchResult.status} />
            </div>

            {searchResult.status === "running" && (
              <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
                <Spinner />
                <span>Agent is researching prices across retailers...</span>
              </div>
            )}

            {searchResult.status === "completed" && searchResult.results.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left p-3 font-medium">Retailer</th>
                      <th className="text-left p-3 font-medium">Price</th>
                      <th className="text-left p-3 font-medium">Condition</th>
                      <th className="text-left p-3 font-medium">In Stock</th>
                      <th className="text-left p-3 font-medium">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.results
                      .sort((a, b) => a.price - b.price)
                      .map((result, i) => (
                        <tr
                          key={i}
                          className={`border-b last:border-0 ${i === 0 ? "bg-green-50 dark:bg-green-950/20" : ""}`}
                        >
                          <td className="p-3 font-medium">
                            {result.retailer_name}
                            {i === 0 && (
                              <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                                Best Deal
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-semibold">
                            ${result.price.toFixed(2)}
                          </td>
                          <td className="p-3 capitalize">{result.condition}</td>
                          <td className="p-3">
                            {result.in_stock ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-red-500">No</span>
                            )}
                          </td>
                          <td className="p-3">
                            {result.url ? (
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-4 hover:text-primary/80"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {searchResult.status === "completed" && searchResult.results.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No price results found. Try a more specific product name.
              </p>
            )}

            {searchResult.status === "failed" && (
              <p className="text-destructive text-center py-8">
                Search failed. Please try again.
              </p>
            )}
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
