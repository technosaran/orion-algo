"""
Orion Algo - Angel One SmartAPI Connector
Complete REST adapter with automated TOTP (pyotp) authentication for Angel One.
"""

import time
import logging
from typing import Dict, Any, List, Optional
import httpx
import pyotp

from app.brokers.base import BrokerAdapter, BrokerOrderRequest

logger = logging.getLogger("angel_one")


class AngelOneAdapter(BrokerAdapter):
    """
    Angel One SmartAPI Adapter.
    Uses Free Angel One API keys with automatic TOTP generation.
    """

    BASE_URL = "https://apiconnect.angelone.in"

    def __init__(self, api_key: str, client_id: str, pin: str, totp_secret: str):
        self.api_key = api_key
        self.client_id = client_id
        self.pin = pin
        self.totp_secret = totp_secret
        self.jwt_token: Optional[str] = None
        self.feed_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.authenticated = False

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-UserType": "USER",
            "X-SourceID": "WEB",
            "X-ClientLocalIP": "127.0.0.1",
            "X-ClientPublicIP": "106.193.147.98",
            "X-MACAddress": "fe80::216e:6507:4b80:b04d",
            "X-PrivateKey": self.api_key,
        }
        if self.jwt_token:
            headers["Authorization"] = f"Bearer {self.jwt_token}"
        return headers

    async def authenticate(self) -> Dict[str, Any]:
        """Performs TOTP-based authentication with SmartAPI."""
        totp_code = pyotp.TOTP(self.totp_secret).now()
        payload = {
            "clientcode": self.client_id,
            "password": self.pin,
            "totp": totp_code,
        }

        url = f"{self.BASE_URL}/rest/auth/partner/v1/loginByPassword"
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(url, json=payload, headers=self._headers())
                data = res.json()
                if data.get("status") and data.get("data"):
                    d = data["data"]
                    self.jwt_token = d.get("jwtToken")
                    self.feed_token = d.get("feedToken")
                    self.refresh_token = d.get("refreshToken")
                    self.authenticated = True
                    logger.info(f"Angel One logged in successfully for client {self.client_id}")
                    return {"success": True, "message": "Angel One authenticated successfully"}
                else:
                    msg = data.get("message", "Login failed")
                    logger.error(f"Angel One login failed: {msg}")
                    return {"success": False, "message": msg}
            except Exception as e:
                logger.error(f"Angel One auth exception: {e}")
                return {"success": False, "message": str(e)}

    async def get_funds(self) -> Dict[str, Any]:
        """Retrieves RMS limits / funds from Angel One."""
        if not self.authenticated:
            return {"error": "Not authenticated with Angel One"}

        url = f"{self.BASE_URL}/rest/secure/angelbroking/user/v1/getRMS"
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(url, headers=self._headers())
                data = res.json()
                if data.get("status"):
                    rms = data.get("data", {})
                    return {
                        "netCash": float(rms.get("net", 0)),
                        "availableMargin": float(rms.get("availablecash", 0)),
                        "collateral": float(rms.get("collateral", 0)),
                    }
                return {"error": data.get("message", "Failed to fetch funds")}
            except Exception as e:
                return {"error": str(e)}

    async def get_positions(self) -> List[Dict[str, Any]]:
        """Retrieves active positions from Angel One."""
        if not self.authenticated:
            return []

        url = f"{self.BASE_URL}/rest/secure/angelbroking/order/v1/getPosition"
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(url, headers=self._headers())
                data = res.json()
                if data.get("status") and data.get("data"):
                    return data["data"]
                return []
            except Exception as e:
                logger.error(f"Angel One get_positions error: {e}")
                return []

    async def get_orders(self) -> List[Dict[str, Any]]:
        """Retrieves today's order book from Angel One."""
        if not self.authenticated:
            return []

        url = f"{self.BASE_URL}/rest/secure/angelbroking/order/v1/getOrderBook"
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.get(url, headers=self._headers())
                data = res.json()
                if data.get("status") and data.get("data"):
                    return data["data"]
                return []
            except Exception as e:
                logger.error(f"Angel One get_orders error: {e}")
                return []

    async def place_order(self, order: BrokerOrderRequest) -> Dict[str, Any]:
        """Places live order on Angel One."""
        if not self.authenticated:
            return {"status": False, "message": "Broker not connected."}

        url = f"{self.BASE_URL}/rest/secure/angelbroking/order/v1/placeOrder"
        payload = {
            "variety": "NORMAL",
            "tradingsymbol": order.symbol,
            "symboltoken": "99926000",  # Map dynamically in prod
            "transactiontype": order.transaction_type.upper(),
            "exchange": order.exchange.upper(),
            "ordertype": order.order_type.upper(),
            "producttype": "INTRADAY" if order.product_type == "MIS" else order.product_type,
            "duration": "DAY",
            "price": str(order.price) if order.price > 0 else "0",
            "squareoff": "0",
            "stoploss": "0",
            "quantity": str(order.quantity),
        }

        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.post(url, json=payload, headers=self._headers())
                return res.json()
            except Exception as e:
                return {"status": False, "message": str(e)}

    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """Cancels a live order on Angel One."""
        url = f"{self.BASE_URL}/rest/secure/angelbroking/order/v1/cancelOrder"
        payload = {"variety": "NORMAL", "orderid": order_id}
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.post(url, json=payload, headers=self._headers())
                return res.json()
            except Exception as e:
                return {"status": False, "message": str(e)}

    async def square_off_all(self) -> Dict[str, Any]:
        """Emergency Kill Switch: Cancels all orders and exits open positions."""
        orders = await self.get_orders()
        cancelled = 0
        for o in orders:
            if o.get("orderstatus") in ["open", "trigger pending"]:
                await self.cancel_order(o["orderid"])
                cancelled += 1

        positions = await self.get_positions()
        closed = 0
        for p in positions:
            net_qty = int(p.get("netqty", 0))
            if net_qty != 0:
                side = "SELL" if net_qty > 0 else "BUY"
                req = BrokerOrderRequest(
                    symbol=p["tradingsymbol"],
                    exchange=p.get("exchange", "NSE"),
                    transaction_type=side,
                    order_type="MARKET",
                    quantity=abs(net_qty),
                )
                await self.place_order(req)
                closed += 1

        return {"status": "success", "cancelled_orders": cancelled, "closed_positions": closed}
