from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Orion Algo API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # CORS configuration: allow Next.js default dev port
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Supabase config
    NEXT_PUBLIC_SUPABASE_URL: str = ""
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    @property
    def get_supabase_url(self) -> str:
        return self.SUPABASE_URL or self.NEXT_PUBLIC_SUPABASE_URL

    @property
    def get_supabase_key(self) -> str:
        return self.SUPABASE_KEY or self.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    model_config = SettingsConfigDict(
        env_file=("../.env.local", ".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
