const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface PriceResult {
  retailer_name: string;
  price: number;
  currency: string;
  url: string;
  condition: string;
  in_stock: boolean;
  scraped_at: string;
}

export interface SearchResponse {
  search_id: string;
  query: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
  best_price: number | null;
  best_retailer: string | null;
  results: PriceResult[];
}

export interface SearchHistoryEntry {
  search_id: string;
  query: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  best_price: number | null;
  best_retailer: string | null;
}

export async function startSearch(query: string): Promise<{ search_id: string }> {
  const res = await fetch(`${API_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  return res.json();
}

export async function getSearch(searchId: string): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/search/${searchId}`);
  if (!res.ok) throw new Error(`Failed to fetch search: ${res.statusText}`);
  return res.json();
}

export async function getHistory(): Promise<SearchHistoryEntry[]> {
  const res = await fetch(`${API_URL}/history`);
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.statusText}`);
  const data = await res.json();
  return data.searches;
}

export function getStreamUrl(searchId: string): string {
  return `${API_URL}/search/${searchId}/stream`;
}
