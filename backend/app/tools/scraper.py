import asyncio
import random
import re

from smolagents import tool

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
]


def _extract_prices(text: str) -> list[str]:
    """Pull all dollar-amount strings from raw text."""
    return re.findall(r"\$[\d,]+\.?\d{0,2}", text)


async def _scrape_page(url: str) -> str:
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            await page.wait_for_timeout(2000)

            title = await page.title()

            price_text = ""
            price_selectors = [
                "[data-price]",
                ".price",
                ".a-price",
                ".priceView-customer-price",
                "#priceblock_ourprice",
                ".product-price",
                ".sale-price",
                ".current-price",
                "[class*='price']",
                "[class*='Price']",
            ]
            for selector in price_selectors:
                elements = await page.query_selector_all(selector)
                for el in elements:
                    text = await el.inner_text()
                    if text.strip():
                        price_text += text.strip() + " | "
                if price_text:
                    break

            if not price_text:
                body_text = await page.inner_text("body")
                prices_found = _extract_prices(body_text)
                price_text = " | ".join(prices_found[:10]) if prices_found else "No prices found"

            return f"Page Title: {title}\nURL: {url}\nPrices Found: {price_text}"
        except Exception as e:
            return f"URL: {url}\nError: Failed to scrape - {str(e)}"
        finally:
            await browser.close()


@tool
def scrape_price(url: str) -> str:
    """
    Scrapes a retailer webpage to extract product price information.
    Returns the page title, URL, and any prices found on the page.
    Use this after finding retailer URLs with web_search to get actual prices.

    Args:
        url: The full URL of a retailer product page to scrape for pricing.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                result = pool.submit(asyncio.run, _scrape_page(url)).result()
            return result
        else:
            return asyncio.run(_scrape_page(url))
    except Exception as e:
        return f"URL: {url}\nError: {str(e)}"
