"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { PriceResult } from "@/lib/api";

interface PriceChartProps {
  results: PriceResult[];
}

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function PriceChart({ results }: PriceChartProps) {
  if (results.length === 0) return null;

  const data = [...results]
    .sort((a, b) => a.price - b.price)
    .map((r) => ({
      name: r.retailer_name,
      price: r.price,
    }));

  const minPrice = Math.min(...data.map((d) => d.price));

  return (
    <div className="rounded-lg border p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Price Comparison</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
          <XAxis type="number" tickFormatter={(v) => `$${v}`} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 13 }} />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Price"]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
            }}
          />
          <Bar dataKey="price" radius={[0, 4, 4, 0]} barSize={28}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.price === minPrice ? "#22c55e" : COLORS[i % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
