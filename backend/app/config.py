from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    gcp_project_id: str = ""
    openrouter_model: str = "anthropic/claude-sonnet-4"
    agent_timeout_seconds: int = 300
    max_retailers_to_scrape: int = 5
    scrape_delay_seconds: float = 1.5
    port: int = 8080

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
