from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    backtest,
    paper_trading,
    strategies,
    market_data,
    live_trading,
    nse_terminal,
    options_lab,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(backtest.router, tags=["backtest"])
api_router.include_router(paper_trading.router, prefix="/paper-trading", tags=["paper-trading"])
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
api_router.include_router(market_data.router, tags=["market-data"])
api_router.include_router(live_trading.router, tags=["live-trading"])
api_router.include_router(nse_terminal.router, tags=["nse-terminal"])
api_router.include_router(options_lab.router, tags=["options-lab"])

