import asyncio
import logging
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.services.paper_matcher import process_paper_engine_tick

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orion_main")


async def paper_engine_daemon_loop():
    """Background engine loop running matching and algo evaluation every 5s."""
    await asyncio.sleep(5)  # Initial grace delay
    logger.info("Starting autonomous server-side paper trading daemon...")
    while True:
        try:
            await process_paper_engine_tick()
        except Exception as e:
            logger.error(f"[Paper Daemon] Error during tick: {e}")
        await asyncio.sleep(5)


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
    
    # Start autonomous paper trading engine daemon
    paper_daemon_task = asyncio.create_task(paper_engine_daemon_loop())

    yield

    if ping_task:
        ping_task.cancel()
    if paper_daemon_task:
        paper_daemon_task.cancel()


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
