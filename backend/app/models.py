from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class SearchStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="Product to search for")


class PriceResult(BaseModel):
    retailer_name: str
    price: float
    currency: str = "USD"
    url: str
    condition: str = "new"
    in_stock: bool = True
    scraped_at: datetime = Field(default_factory=datetime.utcnow)


class SearchResponse(BaseModel):
    search_id: str
    query: str
    status: SearchStatus
    created_at: datetime
    completed_at: datetime | None = None
    best_price: float | None = None
    best_retailer: str | None = None
    results: list[PriceResult] = []


class SearchCreatedResponse(BaseModel):
    search_id: str
    status: SearchStatus = SearchStatus.PENDING
    message: str = "Search started"
