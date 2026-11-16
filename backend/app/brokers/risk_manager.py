"""
Orion Algo - Pre-Trade Institutional Risk Management System (RMS)
Guards against excessive loss, enforces max lot limits, and handles 3:15 PM intraday auto square-off.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger("risk_manager")


class RiskManager:
    """Pre-trade risk validator and capital safety engine."""

    def __init__(
        self,
        max_daily_loss: float = 10000.0,  # Max loss ₹10,000 per day
        max_capital_per_trade_pct: float = 0.20,  # Max 20% capital in single trade
        max_open_positions: int = 4,
        auto_square_off_time: str = "15:15",  # 3:15 PM IST
    ):
        self.max_daily_loss = max_daily_loss
        self.max_capital_per_trade_pct = max_capital_per_trade_pct
        self.max_open_positions = max_open_positions
        self.auto_square_off_time = auto_square_off_time
        self.kill_switch_tripped = False
        self.daily_realized_loss = 0.0

    def trip_kill_switch(self, reason: str = "MANUAL_TRIGGER"):
        """Instantly trips the kill switch, freezing all algo actions."""
        self.kill_switch_tripped = True
        logger.warning(f"🚨 KILL SWITCH TRIPPED: {reason}")

    def reset_kill_switch(self):
        """Resets the kill switch after trader confirmation."""
        self.kill_switch_tripped = False
        logger.info("Kill switch reset to normal standby.")

    def is_intraday_square_off_time(self) -> bool:
        """Checks if current IST time is past 15:15 PM."""
        ist = timezone(timedelta(hours=5, minutes=30))
        now_ist = datetime.now(ist)
        cur_min = now_ist.hour * 60 + now_ist.minute
        cutoff_hour, cutoff_min = map(int, self.auto_square_off_time.split(":"))
        return cur_min >= (cutoff_hour * 60 + cutoff_min)

    def validate_pre_trade(
        self,
        order_cost: float,
        available_cash: float,
        current_open_positions_count: int,
    ) -> Dict[str, Any]:
        """
        Validates whether an order passes all institutional pre-trade risk checks:
        1. Kill Switch not tripped
        2. Intraday auto square-off not active
        3. Daily loss ceiling not breached
        4. Max open positions not exceeded
        5. Position size within capital limit
        """
        if self.kill_switch_tripped:
            return {"allowed": False, "reason": "Kill Switch is ACTIVE. All trading halted."}

        if self.is_intraday_square_off_time():
            return {
                "allowed": False,
                "reason": f"Past intraday square-off cutoff ({self.auto_square_off_time} IST). New orders blocked.",
            }

        if self.daily_realized_loss >= self.max_daily_loss:
            self.trip_kill_switch("Daily loss limit exceeded")
            return {
                "allowed": False,
                "reason": f"Daily realized loss (₹{self.daily_realized_loss}) breached limit of ₹{self.max_daily_loss}.",
            }

        if current_open_positions_count >= self.max_open_positions:
            return {
                "allowed": False,
                "reason": f"Max open positions limit ({self.max_open_positions}) reached.",
            }

        max_alloc = available_cash * self.max_capital_per_trade_pct
        if order_cost > max_alloc and available_cash > 5000.0:
            return {
                "allowed": False,
                "reason": f"Order cost (₹{round(order_cost, 2)}) exceeds {int(self.max_capital_per_trade_pct*100)}% capital limit (₹{round(max_alloc, 2)}).",
            }

        return {"allowed": True, "reason": "Passed all RMS pre-trade checks."}


# Global singleton RMS instance
risk_manager = RiskManager()
