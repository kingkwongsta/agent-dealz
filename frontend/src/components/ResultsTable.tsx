"use client";

import type { PriceResult } from "@/lib/api";

interface ResultsTableProps {
  results: PriceResult[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  const sorted = [...results].sort((a, b) => a.price - b.price);

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No price results found. Try a more specific product name.
      </p>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-left p-3 font-medium">#</th>
            <th className="text-left p-3 font-medium">Retailer</th>
            <th className="text-left p-3 font-medium">Price</th>
            <th className="text-left p-3 font-medium">Condition</th>
            <th className="text-left p-3 font-medium">In Stock</th>
            <th className="text-left p-3 font-medium">Link</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((result, i) => (
            <tr
              key={i}
              className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${
                i === 0 ? "bg-green-50 dark:bg-green-950/20" : ""
              }`}
            >
              <td className="p-3 text-muted-foreground">{i + 1}</td>
              <td className="p-3 font-medium">
                {result.retailer_name}
                {i === 0 && (
                  <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                    Best Deal
                  </span>
                )}
              </td>
              <td className="p-3 font-mono font-semibold text-base">
                ${result.price.toFixed(2)}
              </td>
              <td className="p-3 capitalize">{result.condition}</td>
              <td className="p-3">
                {result.in_stock ? (
                  <span className="text-green-600 dark:text-green-400">In Stock</span>
                ) : (
                  <span className="text-red-500">Out of Stock</span>
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
                    View &rarr;
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
  );
}
