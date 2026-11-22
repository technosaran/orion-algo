"""
Orion Algo - Pre-Trade Institutional Risk Management System (RMS)
Guards against excessive loss, enforces max lot limits, handles anti-revenge cooldowns,
dynamic trailing stops, and 3:15 PM intraday auto square-off.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple
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
        max_consecutive_losses: int = 2,
        cooldown_minutes: int = 30,
    ):
        self.max_daily_loss = max_daily_loss
        self.max_capital_per_trade_pct = max_capital_per_trade_pct
        self.max_open_positions = max_open_positions
        self.auto_square_off_time = auto_square_off_time
        self.max_consecutive_losses = max_consecutive_losses
        self.cooldown_minutes = cooldown_minutes

        self.kill_switch_tripped = False
        self.daily_realized_loss = 0.0
        self.daily_floating_loss = 0.0
        self.consecutive_losses = 0
        self.cooldown_until: Optional[datetime] = None

    def trip_kill_switch(self, reason: str = "MANUAL_TRIGGER"):
        """Instantly trips the kill switch, freezing all algo actions."""
        self.kill_switch_tripped = True
        logger.warning(f"🚨 KILL SWITCH TRIPPED: {reason}")

    def reset_kill_switch(self):
        """Resets the kill switch after trader confirmation."""
        self.kill_switch_tripped = False
        self.cooldown_until = None
        self.consecutive_losses = 0
        logger.info("Kill switch reset to normal standby.")

    def is_intraday_square_off_time(self) -> bool:
        """Checks if current IST time is past 15:15 PM."""
        ist = timezone(timedelta(hours=5, minutes=30))
        now_ist = datetime.now(ist)
        cur_min = now_ist.hour * 60 + now_ist.minute
        cutoff_hour, cutoff_min = map(int, self.auto_square_off_time.split(":"))
        return cur_min >= (cutoff_hour * 60 + cutoff_min)

    def is_in_cooldown(self) -> Tuple[bool, int]:
        """Checks if anti-revenge trading cooldown is active."""
        if not self.cooldown_until:
            return False, 0
        now_utc = datetime.now(timezone.utc)
        if now_utc < self.cooldown_until:
            remaining_sec = (self.cooldown_until - now_utc).total_seconds()
            return True, max(1, int(remaining_sec / 60.0))
        # Cooldown expired
        self.cooldown_until = None
        return False, 0

    def record_trade_outcome(self, pnl: float):
        """
        Records completed trade P&L:
        - Updates realized daily loss.
        - Tracks consecutive losses and triggers anti-revenge trading cooldown.
        - Checks daily loss circuit breaker.
        """
        if pnl < 0:
            loss_amount = abs(pnl)
            self.daily_realized_loss += loss_amount
            self.consecutive_losses += 1
            logger.info(
                f"[RMS] Trade closed at LOSS: -₹{loss_amount:.2f} | Consecutive Losses: {self.consecutive_losses}"
            )
            if self.consecutive_losses >= self.max_consecutive_losses:
                self.cooldown_until = datetime.now(timezone.utc) + timedelta(minutes=self.cooldown_minutes)
                logger.warning(
                    f"⚠️ [RMS Anti-Revenge] {self.consecutive_losses} consecutive losses! Cooling off for {self.cooldown_minutes} minutes."
                )
        else:
            self.consecutive_losses = 0
            logger.info(f"[RMS] Trade closed at PROFIT: +₹{pnl:.2f}. Consecutive loss counter reset.")

        # Check circuit breaker
        if self.daily_realized_loss >= self.max_daily_loss:
            self.trip_kill_switch(
                f"Daily realized loss (₹{self.daily_realized_loss:.2f}) reached ceiling ₹{self.max_daily_loss:.2f}"
            )

    def update_floating_drawdown(self, unrealized_pnl: float):
        """Monitors floating unrealized MTM drawdown to trigger circuit breaker before damage escalates."""
        self.daily_floating_loss = abs(unrealized_pnl) if unrealized_pnl < 0 else 0.0
        total_risk_exposure = self.daily_realized_loss + self.daily_floating_loss
        if total_risk_exposure >= self.max_daily_loss:
            self.trip_kill_switch(
                f"Combined MTM drawdown (₹{total_risk_exposure:.2f}) breached ceiling ₹{self.max_daily_loss:.2f}"
            )

    def calculate_trailing_stop(
        self,
        side: str,
        entry_price: float,
        current_price: float,
        current_sl: float,
        trail_pct: float = 0.03,
    ) -> float:
        """
        Ratchets trailing stop loss monotonically in favor of the trade:
        - LONG: As price moves up, SL moves up. SL NEVER moves down.
        - SHORT: As price moves down, SL moves down. SL NEVER moves up.
        """
        side_upper = side.upper()
        if side_upper in ["LONG", "BUY"]:
            # For LONG, trailing SL sits trail_pct below current high/price
            new_sl = round(current_price * (1.0 - trail_pct), 2)
            # Only ratchet UP
            return max(current_sl, new_sl)
        else:
            # For SHORT, trailing SL sits trail_pct above current low/price
            new_sl = round(current_price * (1.0 + trail_pct), 2)
            # Only ratchet DOWN
            return min(current_sl, new_sl)

    def validate_pre_trade(
        self,
        order_cost: float,
        available_cash: float,
        current_open_positions_count: int,
    ) -> Dict[str, Any]:
        """
        Validates whether an order passes all institutional pre-trade risk checks:
        1. Kill Switch not tripped
        2. Anti-revenge trading cooldown not active
        3. Intraday auto square-off not active
        4. Daily loss ceiling not breached
        5. Max open positions not exceeded
        6. Position size within capital limit
        """
        if self.kill_switch_tripped:
            return {"allowed": False, "reason": "Kill Switch is ACTIVE. All trading halted."}

        in_cooldown, remaining_mins = self.is_in_cooldown()
        if in_cooldown:
            return {
                "allowed": False,
                "reason": f"Anti-revenge trading cooldown active ({remaining_mins}m remaining). Preserving capital.",
            }

        if self.is_intraday_square_off_time():
            return {
                "allowed": False,
                "reason": f"Past intraday square-off cutoff ({self.auto_square_off_time} IST). New orders blocked.",
            }

        total_loss = self.daily_realized_loss + self.daily_floating_loss
        if total_loss >= self.max_daily_loss:
            self.trip_kill_switch("Daily loss limit exceeded")
            return {
                "allowed": False,
                "reason": f"Daily total drawdown (₹{total_loss:.2f}) breached limit of ₹{self.max_daily_loss:.2f}.",
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
