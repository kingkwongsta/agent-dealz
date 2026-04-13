from google.cloud.firestore import AsyncClient
from datetime import datetime
from functools import lru_cache

from app.models import SearchStatus, PriceResult


@lru_cache
def get_firestore_client() -> AsyncClient:
    return AsyncClient()


async def create_search(search_id: str, query: str) -> dict:
    db = get_firestore_client()
    doc_ref = db.collection("searches").document(search_id)
    data = {
        "query": query,
        "status": SearchStatus.RUNNING.value,
        "created_at": datetime.utcnow(),
        "completed_at": None,
        "best_price": None,
        "best_retailer": None,
    }
    await doc_ref.set(data)
    return data


async def update_search_status(search_id: str, status: SearchStatus) -> None:
    db = get_firestore_client()
    doc_ref = db.collection("searches").document(search_id)
    update = {"status": status.value}
    if status == SearchStatus.COMPLETED or status == SearchStatus.FAILED:
        update["completed_at"] = datetime.utcnow()
    await doc_ref.update(update)


async def store_results(search_id: str, results: list[PriceResult]) -> None:
    db = get_firestore_client()
    search_ref = db.collection("searches").document(search_id)

    for result in results:
        result_ref = search_ref.collection("results").document()
        await result_ref.set(result.model_dump())

    if results:
        best = min(results, key=lambda r: r.price)
        await search_ref.update({
            "best_price": best.price,
            "best_retailer": best.retailer_name,
            "status": SearchStatus.COMPLETED.value,
            "completed_at": datetime.utcnow(),
        })


async def get_search(search_id: str) -> dict | None:
    db = get_firestore_client()
    doc_ref = db.collection("searches").document(search_id)
    doc = await doc_ref.get()
    if not doc.exists:
        return None

    data = doc.to_dict()
    data["search_id"] = doc.id

    results_ref = doc_ref.collection("results")
    results_docs = results_ref.stream()
    data["results"] = [r.to_dict() async for r in results_docs]

    return data


async def get_search_history(limit: int = 20) -> list[dict]:
    db = get_firestore_client()
    query = (
        db.collection("searches")
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
    )
    docs = query.stream()
    history = []
    async for doc in docs:
        entry = doc.to_dict()
        entry["search_id"] = doc.id
        history.append(entry)
    return history
