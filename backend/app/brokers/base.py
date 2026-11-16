"""
Orion Algo - Abstract Base Broker Adapter
Defines standard institutional interface for Indian market brokers.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class BrokerOrderRequest(BaseModel):
    symbol: str  # e.g. "RELIANCE-EQ" or "NIFTY26NOV24500CE"
    exchange: str = "NSE"  # NSE, NFO, BSE, MCX
    transaction_type: str  # BUY or SELL
    order_type: str = "MARKET"  # MARKET, LIMIT, SL, SL-M
    product_type: str = "INTRADAY"  # INTRADAY (MIS), DELIVERY (CNC), MARGIN (NRML)
    quantity: int
    price: float = 0.0
    trigger_price: float = 0.0
    tag: str = "ORION_ALGO"


class BrokerAdapter(ABC):
    """Abstract interface that every Indian broker connector must implement."""

    @abstractmethod
    async def authenticate(self) -> Dict[str, Any]:
        """Authenticates with the broker using credentials / TOTP."""
        pass

    @abstractmethod
    async def get_funds(self) -> Dict[str, Any]:
        """Retrieves available trading capital, margin, and collateral."""
        pass

    @abstractmethod
    async def get_positions(self) -> List[Dict[str, Any]]:
        """Retrieves currently open intraday and delivery positions."""
        pass

    @abstractmethod
    async def get_orders(self) -> List[Dict[str, Any]]:
        """Retrieves today's order book (pending, executed, cancelled)."""
        pass

    @abstractmethod
    async def place_order(self, order: BrokerOrderRequest) -> Dict[str, Any]:
        """Submits an order to the exchange via the broker's OMS."""
        pass

    @abstractmethod
    async def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """Cancels a pending order."""
        pass

    @abstractmethod
    async def square_off_all(self) -> Dict[str, Any]:
        """Emergency Kill-Switch: cancels all open orders and market-exits all positions."""
        pass
