from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Returns a singleton instance of the Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        url = settings.get_supabase_url
        key = settings.get_supabase_key
        if not url or not key:
            raise ValueError(
                "Supabase URL or Key is missing. Ensure NEXT_PUBLIC_SUPABASE_URL and "
                "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL and SUPABASE_KEY) are configured."
            )
        _supabase_client = create_client(url, key)
    return _supabase_client
