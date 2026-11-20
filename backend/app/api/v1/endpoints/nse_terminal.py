from fastapi import APIRouter, Query
from app.services.nse_data_service import nse_data_service

router = APIRouter(prefix="/nse", tags=["nse-terminal"])

@router.get("/market-status")
async def get_market_status():
    return await nse_data_service.get_market_status()

@router.get("/indices")
async def get_indices():
    return await nse_data_service.get_all_indices()

@router.get("/fii-dii")
async def get_fii_dii():
    return await nse_data_service.get_fii_dii_activity()

@router.get("/option-chain/{symbol}")
async def get_option_chain(symbol: str):
    return await nse_data_service.get_option_chain(symbol)

@router.get("/gainers-losers")
async def get_gainers_losers(index: str = Query("NIFTY 50")):
    return await nse_data_service.get_gainers_losers(index)

@router.get("/bulk-deals")
async def get_bulk_deals():
    return await nse_data_service.get_bulk_deals()

@router.get("/corporate-actions")
async def get_corporate_actions():
    return await nse_data_service.get_corporate_actions()
