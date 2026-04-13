from smolagents import tool
from duckduckgo_search import DDGS


@tool
def web_search(query: str) -> str:
    """
    Searches the web for a product and returns relevant results with titles, URLs, and snippets.
    Use this to find retailers that sell a specific product.

    Args:
        query: The search query, e.g. "Sony WH-1000XM5 buy price"
    """
    results = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=10):
            results.append(f"Title: {r['title']}\nURL: {r['href']}\nSnippet: {r['body']}\n")

    if not results:
        return "No search results found."

    return "\n---\n".join(results)
