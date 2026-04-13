from smolagents import CodeAgent, LiteLLMModel

from app.config import get_settings
from app.tools.search import web_search
from app.tools.scraper import scrape_price

SYSTEM_PROMPT_SUFFIX = """You are a price research agent. Your goal is to find the best (lowest) price
for a product across multiple retailers.

Follow this strategy:
1. Search the web for the product with terms like "<product> buy price"
2. Pick the top 5 most relevant retailer URLs from the search results (Amazon, Best Buy, Walmart, Target, etc.)
3. Scrape each retailer page to extract the actual price
4. Compare all prices and report the results as a structured summary

For each retailer, report:
- retailer_name: The name of the store
- price: The numeric price (lowest if multiple prices found)
- url: The product page URL
- condition: "new", "open-box", "refurbished", or "used"
- in_stock: true or false based on page content

Always return your final answer as a formatted summary with all retailers found,
sorted from lowest to highest price. Include the best deal at the top.
"""


def create_agent() -> CodeAgent:
    settings = get_settings()

    model = LiteLLMModel(
        model_id=f"openrouter/{settings.openrouter_model}",
        api_key=settings.openrouter_api_key,
    )

    agent = CodeAgent(
        tools=[web_search, scrape_price],
        model=model,
        additional_authorized_imports=["re", "json", "time"],
        max_steps=10,
    )

    return agent


def run_price_search(query: str) -> str:
    agent = create_agent()
    task = f"""Find the best price for: {query}

{SYSTEM_PROMPT_SUFFIX}"""
    result = agent.run(task)
    return result
