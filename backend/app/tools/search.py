import logging

from smolagents import tool
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

MAX_RETRIES = 2


@tool
def web_search(query: str) -> str:
    """
    Searches the web for a product and returns relevant results with titles, URLs, and snippets.
    Use this to find retailers that sell a specific product.

    Args:
        query: The search query, e.g. "Sony WH-1000XM5 buy price"
    """
    for attempt in range(MAX_RETRIES + 1):
        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=10):
                    results.append(
                        f"Title: {r['title']}\nURL: {r['href']}\nSnippet: {r['body']}\n"
                    )

            if not results:
                return "No search results found. Try a different query."

            return "\n---\n".join(results)
        except Exception as e:
            logger.warning(f"Search attempt {attempt + 1} failed: {e}")
            if attempt == MAX_RETRIES:
                return f"Error: Search failed after {MAX_RETRIES + 1} attempts - {type(e).__name__}: {str(e)[:100]}"

    return "Error: Search failed unexpectedly"
