import asyncio
import logging
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("keep_alive")


async def auto_ping_loop(base_url: str):
    """Pings the public Render URL every 9 minutes to prevent Render's 15-minute idle sleep."""
    await asyncio.sleep(120)
    health_endpoint = f"{base_url.rstrip('/')}{settings.API_V1_STR}/health"
    logger.info(f"Starting keep-alive loop targeting: {health_endpoint}")

    while True:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(health_endpoint)
                logger.info(f"[Keep-Alive] Self-ping status: {res.status_code}")
        except Exception as e:
            logger.warning(f"[Keep-Alive] Ping error: {e}")
        # Sleep for 9 minutes (540 seconds)
        await asyncio.sleep(540)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ping_task = None
    if settings.RENDER_EXTERNAL_URL:
        logger.info(f"Render environment detected: {settings.RENDER_EXTERNAL_URL}")
        ping_task = asyncio.create_task(auto_ping_loop(settings.RENDER_EXTERNAL_URL))
    yield
    if ping_task:
        ping_task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set up CORS middleware for Next.js frontend communication (Localhost & Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
