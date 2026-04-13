import asyncio
import random
import re
import time
import logging

from smolagents import tool

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
]

BLOCKED_DOMAINS = ["google.com", "youtube.com", "facebook.com", "instagram.com", "twitter.com"]


def _extract_prices(text: str) -> list[str]:
    """Pull all dollar-amount strings from raw text."""
    return re.findall(r"\$[\d,]+\.?\d{0,2}", text)


def _is_blocked_domain(url: str) -> bool:
    from urllib.parse import urlparse
    try:
        domain = urlparse(url).netloc.lower()
        return any(blocked in domain for blocked in BLOCKED_DOMAINS)
    except Exception:
        return False


async def _scrape_page(url: str) -> str:
    from playwright.async_api import async_playwright

    if _is_blocked_domain(url):
        return f"URL: {url}\nError: Domain not supported for scraping"

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": random.choice([1366, 1440, 1920]), "height": random.choice([768, 900, 1080])},
            locale="en-US",
            timezone_id="America/Los_Angeles",
        )

        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)

        page = await context.new_page()
        try:
            response = await page.goto(url, wait_until="domcontentloaded", timeout=20000)

            if response and response.status >= 400:
                return f"URL: {url}\nError: HTTP {response.status}"

            await page.wait_for_timeout(random.randint(1500, 3000))

            title = await page.title()

            price_text = ""
            price_selectors = [
                "[data-price]",
                ".price",
                ".a-price .a-offscreen",
                ".a-price",
                ".priceView-customer-price span",
                ".priceView-customer-price",
                "#priceblock_ourprice",
                ".product-price",
                ".sale-price",
                ".current-price",
                "[data-testid*='price']",
                "[class*='price']",
                "[class*='Price']",
            ]
            for selector in price_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    for el in elements:
                        text = await el.inner_text()
                        cleaned = text.strip()
                        if cleaned and "$" in cleaned:
                            price_text += cleaned + " | "
                except Exception:
                    continue
                if price_text:
                    break

            if not price_text:
                body_text = await page.inner_text("body")
                prices_found = _extract_prices(body_text)
                price_text = " | ".join(prices_found[:10]) if prices_found else "No prices found"

            return f"Page Title: {title}\nURL: {url}\nPrices Found: {price_text}"
        except Exception as e:
            logger.warning(f"Scrape failed for {url}: {e}")
            return f"URL: {url}\nError: Failed to scrape - {type(e).__name__}: {str(e)[:100]}"
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
    start = time.time()
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                result = pool.submit(asyncio.run, _scrape_page(url)).result(timeout=30)
            return result
        else:
            return asyncio.run(_scrape_page(url))
    except TimeoutError:
        return f"URL: {url}\nError: Scrape timed out after 30s"
    except Exception as e:
        return f"URL: {url}\nError: {type(e).__name__}: {str(e)[:100]}"
    finally:
        elapsed = time.time() - start
        logger.info(f"Scrape {url} took {elapsed:.1f}s")
