"""
Orion Algo - Zerodha Kite Connect Connector
Adapter for Zerodha Kite Connect API.
"""

import logging
from typing import Dict, Any, List, Optional
import httpx
from app.brokers.base import BrokerAdapter, BrokerOrderRequest

logger = logging.getLogger("zerodha")


class ZerodhaAdapter(BrokerAdapter):
    """Zerodha Kite Connect REST Adapter."""

    BASE_URL = "https://api.kite.trade"

    def __init__(self, api_key: str, access_token: str):
        self.api_key = api_key
        self.access_token = access_token
        self.authenticated = bool(api_key and access_token)

    def _headers(self) -> Dict[str, str]:
        return {
            "X-Kite-Version": "3",
            "Authorization": f"token {self.api_key}:{self.access_token}",
        }

    async def authenticate(self) -> Dict[str, Any]:
        """Validates current access token with Kite profile endpoint."""
        url = f"{self.BASE_URL}/user/profile"
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(url, headers=self._headers())
                data = res.json()
                if data.get("status") == "success":
                    self.authenticated = True
                    return {"success": True, "user_name": data["data"].get("user_name")}
                return {"success": False, "message": data.get("message", "Auth failed")}
            except Exception as e:
                return {"success": False, "message": str(e)}

    async def get_funds(self) -> Dict[str, Any]:
        """Retrieves user margins."""
        url = f"{self.BASE_URL}/user/margins"
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(url, headers=self._headers())
                data = res.json()
                if data.get("status") == "success":
                    eq = data["data"].get("equity", {})
                    return {
                        "netCash": eq.get("net", 0.0),
                        "availableMargin": eq.get("available", {}).get("cash", 0.0),
                    }
                return {"error": "Failed to fetch margins"}
            except Exception as e:
                return {"error": str(e)}

    async def get_positions(self) -> List[Dict[str, Any]]:
        """Retrieves day & net positions."""
        url = f"{self.BASE_URL}/portfolio/positions"
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(url, headers=self._headers())
                data = res.json()
                if data.get("status") == "success":
                    return data["data"].get("net", [])
                return []
            except Exception as e:
                return []

    async def get_orders(self) -> List[Dict[str, Any]]:
        """Retrieves orders."""
        url = f"{self.BASE_URL}/orders"
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(url, headers=self._headers())
                data = res.json()
                if data.get("status") == "success":
                    return data.get("data", [])
                return []
            except Exception as e:
                return []

    async def place_order(self, order: BrokerOrderRequest) -> Dict[str, Any]:
        """Submits regular order."""
        url = f"{self.BASE_URL}/orders/regular"
        payload = {
            "tradingsymbol": order.symbol,
            "exchange": order.exchange,
            "transaction_type": order.transaction_type,
            "order_type": order.order_type,
            "quantity": str(order.quantity),
            "product": "MIS" if order.product_type == "INTRADAY" else "CNC",
            "price": str(order.price) if order.price > 0 else "0",
            "validity": "DAY",
            "tag": order.tag,
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.post(url, data=payload, headers=self._headers())
                return res.json()
            except Exception as e:
                return {"status": "error", "message": str(e)}

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """Cancels an open order."""
        url = f"{self.BASE_URL}/orders/regular/{order_id}"
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.delete(url, headers=self._headers())
                return res.json()
            except Exception as e:
                return {"status": "error", "message": str(e)}

    async def square_off_all(self) -> Dict[str, Any]:
        """Emergency Kill Switch."""
        positions = await self.get_positions()
        closed = 0
        for p in positions:
            qty = p.get("quantity", 0)
            if qty != 0:
                side = "SELL" if qty > 0 else "BUY"
                req = BrokerOrderRequest(
                    symbol=p["tradingsymbol"],
                    exchange=p["exchange"],
                    transaction_type=side,
                    quantity=abs(qty),
                )
                await self.place_order(req)
                closed += 1
        return {"status": "success", "closed_positions": closed}
