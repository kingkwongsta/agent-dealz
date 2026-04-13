import asyncio
import json
import re
import uuid
import logging
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.models import (
    SearchRequest,
    SearchCreatedResponse,
    SearchResponse,
    SearchStatus,
    PriceResult,
)
from app.db import create_search, update_search_status, store_results, get_search, get_search_history
from app.agent import run_price_search

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(
    title="Agent Dealz API",
    description="AI-powered price research agent that finds the best deals",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_active_searches: dict[str, dict] = {}


def _parse_agent_results(raw_output: str) -> list[PriceResult]:
    """Best-effort parsing of the agent's free-text output into structured results."""
    results = []

    json_match = re.search(r"\[.*\]", raw_output, re.DOTALL)
    if json_match:
        try:
            parsed = json.loads(json_match.group())
            for item in parsed:
                results.append(PriceResult(
                    retailer_name=item.get("retailer_name", item.get("retailer", "Unknown")),
                    price=float(item.get("price", 0)),
                    currency=item.get("currency", "USD"),
                    url=item.get("url", ""),
                    condition=item.get("condition", "new"),
                    in_stock=item.get("in_stock", True),
                ))
            return results
        except (json.JSONDecodeError, ValueError, KeyError):
            pass

    price_pattern = re.compile(
        r"(?P<retailer>[A-Za-z][A-Za-z\s&'.]+?)[\s:–\-|]+\$(?P<price>[\d,]+\.?\d{0,2})",
    )
    for match in price_pattern.finditer(raw_output):
        retailer = match.group("retailer").strip().rstrip(":-–|")
        price_str = match.group("price").replace(",", "")
        try:
            results.append(PriceResult(
                retailer_name=retailer,
                price=float(price_str),
                url="",
                condition="new",
            ))
        except ValueError:
            continue

    return results


async def _execute_search(search_id: str, query: str) -> None:
    """Run the agent in a background thread and persist results."""
    try:
        await create_search(search_id, query)
        _active_searches[search_id] = {"status": "running", "logs": []}

        def log_callback(entry: dict):
            if search_id in _active_searches:
                _active_searches[search_id]["logs"].append(entry)

        loop = asyncio.get_event_loop()
        raw_result = await loop.run_in_executor(
            None, lambda: run_price_search(query, log_callback=log_callback)
        )

        raw_str = str(raw_result) if raw_result else ""
        results = _parse_agent_results(raw_str)

        if results:
            await store_results(search_id, results)
        else:
            await update_search_status(search_id, SearchStatus.COMPLETED)

        _active_searches[search_id]["status"] = "completed"
        _active_searches[search_id]["raw_output"] = raw_str
        _active_searches[search_id]["result_count"] = len(results)
    except Exception as e:
        logger.exception(f"Search {search_id} failed: {e}")
        try:
            await update_search_status(search_id, SearchStatus.FAILED)
        except Exception:
            pass
        if search_id in _active_searches:
            _active_searches[search_id]["status"] = "failed"
            _active_searches[search_id]["error"] = str(e)
        else:
            _active_searches[search_id] = {"status": "failed", "error": str(e)}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/search", response_model=SearchCreatedResponse)
async def start_search(request: SearchRequest, background_tasks: BackgroundTasks):
    search_id = str(uuid.uuid4())
    _active_searches[search_id] = {"status": "pending"}
    background_tasks.add_task(_execute_search, search_id, request.query)
    return SearchCreatedResponse(search_id=search_id)


@app.get("/search/{search_id}", response_model=SearchResponse)
async def get_search_status(search_id: str):
    data = await get_search(search_id)
    if not data:
        in_memory = _active_searches.get(search_id)
        if in_memory and in_memory["status"] == "pending":
            return SearchResponse(
                search_id=search_id,
                query="",
                status=SearchStatus.PENDING,
                created_at=datetime.utcnow(),
            )
        raise HTTPException(status_code=404, detail="Search not found")

    return SearchResponse(
        search_id=data["search_id"],
        query=data.get("query", ""),
        status=SearchStatus(data.get("status", "running")),
        created_at=data.get("created_at", datetime.utcnow()),
        completed_at=data.get("completed_at"),
        best_price=data.get("best_price"),
        best_retailer=data.get("best_retailer"),
        results=[PriceResult(**r) for r in data.get("results", [])],
    )


@app.get("/search/{search_id}/stream")
async def stream_search(search_id: str):
    """SSE endpoint that streams agent step logs until completion."""
    async def event_generator():
        sent_count = 0
        while True:
            search_data = _active_searches.get(search_id, {})
            status = search_data.get("status", "unknown")
            logs = search_data.get("logs", [])

            while sent_count < len(logs):
                yield f"data: {json.dumps(logs[sent_count])}\n\n"
                sent_count += 1

            if status in ("completed", "failed"):
                yield f"data: {json.dumps({'type': 'done', 'status': status})}\n\n"
                break

            yield f"data: {json.dumps({'type': 'heartbeat', 'status': status})}\n\n"
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/history")
async def list_searches(limit: int = 20):
    history = await get_search_history(limit)
    return {"searches": history}
