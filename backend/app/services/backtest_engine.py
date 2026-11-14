import math
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class BacktestRequest(BaseModel):
    strategy: str = Field("sma_crossover", description="Strategy key")
    symbol: str = Field("BTC/USDT", description="Asset symbol")
    timeframe: str = Field("1h", description="Candle timeframe: 5m, 15m, 1h, 4h, 1d")
    initial_capital: float = Field(10000.0, ge=100.0, description="Initial balance")
    date_range_days: int = Field(90, ge=7, le=730, description="Backtesting lookback in days")
    slippage_pct: float = Field(0.05, ge=0.0, le=5.0, description="Slippage percentage per order")
    fee_pct: float = Field(0.075, ge=0.0, le=2.0, description="Brokerage / exchange fee percentage")
    leverage: float = Field(1.0, ge=1.0, le=20.0, description="Leverage multiplier")
    stop_loss_pct: Optional[float] = Field(2.5, description="Stop loss percentage")
    take_profit_pct: Optional[float] = Field(6.0, description="Take profit percentage")
    trailing_stop_pct: Optional[float] = Field(None, description="Trailing stop loss percentage")
    strategy_params: Dict[str, Any] = Field(default_factory=dict, description="Strategy-specific parameters")


class Trade(BaseModel):
    id: int
    symbol: str
    type: str  # "LONG" or "SHORT"
    entry_time: str
    exit_time: str
    entry_price: float
    exit_price: float
    size: float
    invested_amount: float
    pnl: float
    pnl_pct: float
    exit_reason: str  # "Take Profit", "Stop Loss", "Trailing Stop", "Signal Close"
    fee_paid: float
    duration_bars: int


class EquityPoint(BaseModel):
    timestamp: str
    equity: float
    benchmark: float
    drawdown_pct: float


class BacktestSummary(BaseModel):
    initial_capital: float
    final_equity: float
    net_profit: float
    net_profit_pct: float
    benchmark_return_pct: float
    alpha: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    profit_factor: float
    max_drawdown_pct: float
    max_drawdown_amount: float
    sharpe_ratio: float
    sortino_ratio: float
    avg_trade_pnl: float
    avg_win_pnl: float
    avg_loss_pnl: float
    win_loss_ratio: float
    max_consecutive_wins: int
    max_consecutive_losses: int
    total_fees_paid: float
    expectancy: float


class BacktestResponse(BaseModel):
    success: bool
    strategy: str
    symbol: str
    timeframe: str
    summary: BacktestSummary
    equity_curve: List[EquityPoint]
    trades: List[Trade]
    monthly_returns: Dict[str, float]


# Base asset characteristics for realistic price generation
ASSET_PROFILES = {
    "BTC/USDT": {"base_price": 64500.0, "annual_vol": 0.55, "drift": 0.25},
    "ETH/USDT": {"base_price": 3450.0, "annual_vol": 0.65, "drift": 0.28},
    "SOL/USDT": {"base_price": 175.0, "annual_vol": 0.85, "drift": 0.35},
    "NIFTY50": {"base_price": 24200.0, "annual_vol": 0.16, "drift": 0.14},
    "BANKNIFTY": {"base_price": 51500.0, "annual_vol": 0.20, "drift": 0.16},
    "AAPL": {"base_price": 225.0, "annual_vol": 0.24, "drift": 0.18},
    "TSLA": {"base_price": 245.0, "annual_vol": 0.52, "drift": 0.20},
    "NVDA": {"base_price": 138.0, "annual_vol": 0.48, "drift": 0.40},
    "XAU/USD": {"base_price": 2680.0, "annual_vol": 0.15, "drift": 0.12},
}

TIMEFRAME_MINUTES = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1h": 60,
    "4h": 240,
    "1d": 1440,
}


def generate_candles(symbol: str, timeframe: str, days: int) -> List[Dict[str, Any]]:
    """Generates realistic OHLCV price series for backtesting."""
    profile = ASSET_PROFILES.get(
        symbol, {"base_price": 1000.0, "annual_vol": 0.35, "drift": 0.15}
    )
    base_price = profile["base_price"]
    vol = profile["annual_vol"]
    drift = profile["drift"]

    tf_min = TIMEFRAME_MINUTES.get(timeframe, 60)
    total_minutes = days * 1440
    num_candles = min(2000, max(50, total_minutes // tf_min))

    # Time per candle in fractional year
    dt = (tf_min / 1440) / 365.0
    drift_step = (drift - 0.5 * vol**2) * dt
    vol_step = vol * math.sqrt(dt)

    now = datetime.now(timezone.utc)
    start_time = now - timedelta(minutes=num_candles * tf_min)

    # Use deterministic seed based on symbol & days so backtests are reproducible
    seed_val = sum(ord(c) for c in symbol) + days * 37 + tf_min * 13
    rng = random.Random(seed_val)

    # Start price with slight deviation from base
    current_close = base_price * (1.0 + rng.uniform(-0.10, 0.05))
    candles = []

    # Regime shifts for realistic trends & consolidations
    trend_cycle = rng.uniform(20, 60)

    for i in range(num_candles):
        candle_time = start_time + timedelta(minutes=i * tf_min)

        # Sine wave regime (cycles of bull / bear / chop)
        regime = math.sin(i / trend_cycle) * 0.003
        shock = rng.gauss(0, 1) * vol_step + drift_step + regime

        open_p = current_close
        close_p = open_p * math.exp(shock)

        # High and low with intra-bar volatility
        intra_spread = abs(shock) + rng.uniform(0.001, 0.008)
        high_p = max(open_p, close_p) * (1.0 + rng.uniform(0.0, intra_spread))
        low_p = min(open_p, close_p) * (1.0 - rng.uniform(0.0, intra_spread))

        # Volume
        volume = rng.uniform(500, 5000) * (1.0 + abs(shock) * 15)

        candles.append({
            "timestamp": candle_time.isoformat(),
            "open": round(open_p, 2),
            "high": round(high_p, 2),
            "low": round(low_p, 2),
            "close": round(close_p, 2),
            "volume": round(volume, 1),
        })
        current_close = close_p

    return candles


# Indicator helpers
def calc_sma(data: List[float], period: int) -> List[Optional[float]]:
    result = [None] * len(data)
    if len(data) < period:
        return result
    current_sum = sum(data[:period])
    result[period - 1] = current_sum / period
    for i in range(period, len(data)):
        current_sum += data[i] - data[i - period]
        result[i] = current_sum / period
    return result


def calc_ema(data: List[float], period: int) -> List[Optional[float]]:
    result = [None] * len(data)
    if len(data) < period:
        return result
    multiplier = 2.0 / (period + 1.0)
    sma = sum(data[:period]) / period
    result[period - 1] = sma
    prev_ema = sma
    for i in range(period, len(data)):
        val = (data[i] - prev_ema) * multiplier + prev_ema
        result[i] = val
        prev_ema = val
    return result


def calc_rsi(data: List[float], period: int = 14) -> List[Optional[float]]:
    result = [None] * len(data)
    if len(data) <= period:
        return result

    gains = []
    losses = []
    for i in range(1, len(data)):
        change = data[i] - data[i - 1]
        gains.append(max(0.0, change))
        losses.append(max(0.0, -change))

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    if avg_loss == 0:
        result[period] = 100.0
    else:
        rs = avg_gain / avg_loss
        result[period] = 100.0 - (100.0 / (1.0 + rs))

    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        if avg_loss == 0:
            result[i + 1] = 100.0
        else:
            rs = avg_gain / avg_loss
            result[i + 1] = 100.0 - (100.0 / (1.0 + rs))
    return result


def calc_bollinger_bands(
    data: List[float], period: int = 20, num_std: float = 2.0
) -> Dict[str, List[Optional[float]]]:
    smas = calc_sma(data, period)
    upper = [None] * len(data)
    lower = [None] * len(data)

    for i in range(period - 1, len(data)):
        window = data[i - period + 1 : i + 1]
        mean = smas[i]
        variance = sum((x - mean) ** 2 for x in window) / period
        std_dev = math.sqrt(variance)
        upper[i] = mean + num_std * std_dev
        lower[i] = mean - num_std * std_dev

    return {"middle": smas, "upper": upper, "lower": lower}


def calc_macd(
    data: List[float], fast: int = 12, slow: int = 26, signal: int = 9
) -> Dict[str, List[Optional[float]]]:
    ema_fast = calc_ema(data, fast)
    ema_slow = calc_ema(data, slow)
    macd_line: List[Optional[float]] = [None] * len(data)

    for i in range(len(data)):
        if ema_fast[i] is not None and ema_slow[i] is not None:
            macd_line[i] = ema_fast[i] - ema_slow[i]

    # Signal line is EMA of macd_line
    valid_macd = [x for x in macd_line if x is not None]
    valid_signal = calc_ema(valid_macd, signal)

    signal_line: List[Optional[float]] = [None] * len(data)
    histogram: List[Optional[float]] = [None] * len(data)

    offset = len(data) - len(valid_signal)
    for idx, sig in enumerate(valid_signal):
        pos = offset + idx
        signal_line[pos] = sig
        if macd_line[pos] is not None and sig is not None:
            histogram[pos] = macd_line[pos] - sig

    return {"macd": macd_line, "signal": signal_line, "hist": histogram}


def run_backtest_simulation(req: BacktestRequest) -> BacktestResponse:
    candles = generate_candles(req.symbol, req.timeframe, req.date_range_days)
    closes = [c["close"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    timestamps = [c["timestamp"] for c in candles]

    strategy = req.strategy.lower()
    p = req.strategy_params

    # Signals: 1 = BUY/LONG, -1 = SELL/EXIT, 0 = HOLD
    signals = [0] * len(candles)

    if strategy in ("sma_crossover", "ema_crossover"):
        fast_p = int(p.get("fast_period", 9 if strategy == "ema_crossover" else 20))
        slow_p = int(p.get("slow_period", 21 if strategy == "ema_crossover" else 50))
        if strategy == "sma_crossover":
            fast_ma = calc_sma(closes, fast_p)
            slow_ma = calc_sma(closes, slow_p)
        else:
            fast_ma = calc_ema(closes, fast_p)
            slow_ma = calc_ema(closes, slow_p)

        for i in range(1, len(candles)):
            if (
                fast_ma[i] is not None
                and slow_ma[i] is not None
                and fast_ma[i - 1] is not None
                and slow_ma[i - 1] is not None
            ):
                # Bullish cross
                if fast_ma[i - 1] <= slow_ma[i - 1] and fast_ma[i] > slow_ma[i]:
                    signals[i] = 1
                # Bearish cross
                elif fast_ma[i - 1] >= slow_ma[i - 1] and fast_ma[i] < slow_ma[i]:
                    signals[i] = -1

    elif strategy == "rsi_momentum":
        rsi_period = int(p.get("rsi_period", 14))
        oversold = float(p.get("oversold", 30))
        overbought = float(p.get("overbought", 70))
        rsi_values = calc_rsi(closes, rsi_period)

        for i in range(1, len(candles)):
            if rsi_values[i] is not None and rsi_values[i - 1] is not None:
                # RSI crosses above oversold -> BUY
                if rsi_values[i - 1] <= oversold and rsi_values[i] > oversold:
                    signals[i] = 1
                # RSI crosses below overbought -> SELL
                elif rsi_values[i - 1] >= overbought and rsi_values[i] < overbought:
                    signals[i] = -1

    elif strategy == "macd_trend":
        fast = int(p.get("fast_period", 12))
        slow = int(p.get("slow_period", 26))
        sig = int(p.get("signal_period", 9))
        macd_data = calc_macd(closes, fast, slow, sig)
        hist = macd_data["hist"]

        for i in range(1, len(candles)):
            if hist[i] is not None and hist[i - 1] is not None:
                if hist[i - 1] <= 0 and hist[i] > 0:
                    signals[i] = 1
                elif hist[i - 1] >= 0 and hist[i] < 0:
                    signals[i] = -1

    elif strategy == "bollinger_bands":
        bb_period = int(p.get("bb_period", 20))
        bb_std = float(p.get("bb_std", 2.0))
        bands = calc_bollinger_bands(closes, bb_period, bb_std)
        lower_band = bands["lower"]
        upper_band = bands["upper"]

        for i in range(1, len(candles)):
            if (
                lower_band[i] is not None
                and upper_band[i] is not None
                and lower_band[i - 1] is not None
                and upper_band[i - 1] is not None
            ):
                # Price rebounds from lower band
                if closes[i - 1] <= lower_band[i - 1] and closes[i] > lower_band[i]:
                    signals[i] = 1
                # Price touches or exceeds upper band
                elif closes[i - 1] >= upper_band[i - 1] and closes[i] < upper_band[i]:
                    signals[i] = -1

    else:
        # Default fallback to 20/50 SMA crossover
        fast_ma = calc_sma(closes, 20)
        slow_ma = calc_sma(closes, 50)
        for i in range(1, len(candles)):
            if (
                fast_ma[i] is not None
                and slow_ma[i] is not None
                and fast_ma[i - 1] is not None
                and slow_ma[i - 1] is not None
            ):
                if fast_ma[i - 1] <= slow_ma[i - 1] and fast_ma[i] > slow_ma[i]:
                    signals[i] = 1
                elif fast_ma[i - 1] >= slow_ma[i - 1] and fast_ma[i] < slow_ma[i]:
                    signals[i] = -1

    # Simulate execution
    initial_cap = req.initial_capital
    current_cash = initial_cap
    current_equity = initial_cap
    trades: List[Trade] = []
    equity_curve: List[EquityPoint] = []

    active_trade: Optional[Dict[str, Any]] = None
    trade_id_counter = 1

    slippage_rate = req.slippage_pct / 100.0
    fee_rate = req.fee_pct / 100.0
    leverage = req.leverage

    benchmark_start_price = closes[0]
    peak_equity = initial_cap

    for i in range(len(candles)):
        close_p = closes[i]
        high_p = highs[i]
        low_p = lows[i]
        time_str = timestamps[i]

        # Check active trade exits (Stop Loss, Take Profit, Trailing Stop, Signal)
        if active_trade:
            entry_p = active_trade["entry_price"]
            highest_since_entry = max(active_trade.get("highest_price", entry_p), high_p)
            active_trade["highest_price"] = highest_since_entry

            exit_reason = None
            exit_price = None

            # 1. Stop Loss check
            if req.stop_loss_pct:
                sl_price = entry_p * (1.0 - (req.stop_loss_pct / 100.0) / leverage)
                if low_p <= sl_price:
                    exit_reason = "Stop Loss"
                    exit_price = sl_price * (1.0 - slippage_rate)

            # 2. Take Profit check
            if not exit_reason and req.take_profit_pct:
                tp_price = entry_p * (1.0 + (req.take_profit_pct / 100.0) / leverage)
                if high_p >= tp_price:
                    exit_reason = "Take Profit"
                    exit_price = tp_price * (1.0 - slippage_rate)

            # 3. Trailing Stop check
            if not exit_reason and req.trailing_stop_pct:
                trail_price = highest_since_entry * (1.0 - (req.trailing_stop_pct / 100.0))
                if low_p <= trail_price and trail_price > entry_p:
                    exit_reason = "Trailing Stop"
                    exit_price = trail_price * (1.0 - slippage_rate)

            # 4. Strategy Exit Signal check
            if not exit_reason and signals[i] == -1:
                exit_reason = "Signal Exit"
                exit_price = close_p * (1.0 - slippage_rate)

            # If exited, close position
            if exit_reason and exit_price:
                size = active_trade["size"]
                gross_proceeds = size * exit_price
                exit_fee = gross_proceeds * fee_rate
                total_fees = active_trade["entry_fee"] + exit_fee

                # PnL accounting
                pnl = (exit_price - entry_p) * size * leverage - total_fees
                invested = active_trade["invested_amount"]
                pnl_pct = (pnl / invested) * 100.0 if invested > 0 else 0.0

                current_cash += invested + pnl
                duration_bars = i - active_trade["entry_bar"]

                trades.append(
                    Trade(
                        id=trade_id_counter,
                        symbol=req.symbol,
                        type="LONG",
                        entry_time=active_trade["entry_time"],
                        exit_time=time_str,
                        entry_price=round(entry_p, 2),
                        exit_price=round(exit_price, 2),
                        size=round(size, 4),
                        invested_amount=round(invested, 2),
                        pnl=round(pnl, 2),
                        pnl_pct=round(pnl_pct, 2),
                        exit_reason=exit_reason,
                        fee_paid=round(total_fees, 2),
                        duration_bars=duration_bars,
                    )
                )
                trade_id_counter += 1
                active_trade = None

        # Check new entry condition
        if not active_trade and signals[i] == 1:
            # Position sizing: use 95% of current cash
            alloc_cash = current_cash * 0.95
            if alloc_cash > 50.0:
                eff_entry_price = close_p * (1.0 + slippage_rate)
                entry_fee = alloc_cash * fee_rate
                invested = alloc_cash - entry_fee
                size = (invested * leverage) / eff_entry_price

                current_cash -= alloc_cash
                active_trade = {
                    "entry_time": time_str,
                    "entry_price": eff_entry_price,
                    "entry_fee": entry_fee,
                    "size": size,
                    "invested_amount": invested,
                    "entry_bar": i,
                    "highest_price": close_p,
                }

        # Calculate current equity point
        unrealized_pnl = 0.0
        if active_trade:
            unrealized_pnl = (
                (close_p - active_trade["entry_price"])
                * active_trade["size"]
                * leverage
            )
            current_equity = current_cash + active_trade["invested_amount"] + unrealized_pnl
        else:
            current_equity = current_cash

        peak_equity = max(peak_equity, current_equity)
        dd_pct = ((peak_equity - current_equity) / peak_equity) * 100.0 if peak_equity > 0 else 0.0

        # Benchmark calculation
        benchmark_val = initial_cap * (close_p / benchmark_start_price)

        # Record equity curve points
        equity_curve.append(
            EquityPoint(
                timestamp=time_str,
                equity=round(current_equity, 2),
                benchmark=round(benchmark_val, 2),
                drawdown_pct=round(dd_pct, 2),
            )
        )

    # Close any open trade at final candle
    if active_trade:
        final_close = closes[-1] * (1.0 - slippage_rate)
        size = active_trade["size"]
        gross_proceeds = size * final_close
        exit_fee = gross_proceeds * fee_rate
        total_fees = active_trade["entry_fee"] + exit_fee
        pnl = (final_close - active_trade["entry_price"]) * size * leverage - total_fees
        invested = active_trade["invested_amount"]
        pnl_pct = (pnl / invested) * 100.0 if invested > 0 else 0.0

        current_cash += invested + pnl
        duration_bars = len(candles) - 1 - active_trade["entry_bar"]

        trades.append(
            Trade(
                id=trade_id_counter,
                symbol=req.symbol,
                type="LONG",
                entry_time=active_trade["entry_time"],
                exit_time=timestamps[-1],
                entry_price=round(active_trade["entry_price"], 2),
                exit_price=round(final_close, 2),
                size=round(size, 4),
                invested_amount=round(invested, 2),
                pnl=round(pnl, 2),
                pnl_pct=round(pnl_pct, 2),
                exit_reason="End of Backtest",
                fee_paid=round(total_fees, 2),
                duration_bars=duration_bars,
            )
        )
        current_equity = current_cash

    # Performance Analytics
    total_trades = len(trades)
    winning_trades = [t for t in trades if t.pnl > 0]
    losing_trades = [t for t in trades if t.pnl <= 0]

    win_count = len(winning_trades)
    loss_count = len(losing_trades)
    win_rate = (win_count / total_trades * 100.0) if total_trades > 0 else 0.0

    gross_profit = sum(t.pnl for t in winning_trades)
    gross_loss = abs(sum(t.pnl for t in losing_trades))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (99.0 if gross_profit > 0 else 0.0)

    net_profit = current_equity - initial_cap
    net_profit_pct = (net_profit / initial_cap) * 100.0

    benchmark_ret = ((closes[-1] - closes[0]) / closes[0]) * 100.0
    alpha = net_profit_pct - benchmark_ret

    max_dd_pct = max((pt.drawdown_pct for pt in equity_curve), default=0.0)
    max_dd_amt = (max_dd_pct / 100.0) * peak_equity

    # Daily returns for Sharpe / Sortino
    daily_returns = []
    for k in range(1, len(equity_curve)):
        prev_eq = equity_curve[k - 1].equity
        cur_eq = equity_curve[k].equity
        if prev_eq > 0:
            daily_returns.append((cur_eq - prev_eq) / prev_eq)

    if len(daily_returns) > 1:
        avg_ret = sum(daily_returns) / len(daily_returns)
        var = sum((r - avg_ret) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        std_ret = math.sqrt(var)

        downside_returns = [r for r in daily_returns if r < 0]
        downside_var = (
            sum(r**2 for r in downside_returns) / len(downside_returns)
            if downside_returns
            else 0.0001
        )
        downside_std = math.sqrt(downside_var)

        # Annualization factor
        annual_factor = math.sqrt(252 * (1440 / TIMEFRAME_MINUTES.get(req.timeframe, 60)))
        sharpe = (avg_ret / std_ret * annual_factor) if std_ret > 0 else 0.0
        sortino = (avg_ret / downside_std * annual_factor) if downside_std > 0 else 0.0
    else:
        sharpe = 0.0
        sortino = 0.0

    avg_win = (gross_profit / win_count) if win_count > 0 else 0.0
    avg_loss = (gross_loss / loss_count) if loss_count > 0 else 0.0
    win_loss_ratio = (avg_win / avg_loss) if avg_loss > 0 else 0.0
    avg_trade_pnl = (net_profit / total_trades) if total_trades > 0 else 0.0

    # Consecutive wins / losses
    cur_cons_win = 0
    cur_cons_loss = 0
    max_cons_win = 0
    max_cons_loss = 0
    for t in trades:
        if t.pnl > 0:
            cur_cons_win += 1
            cur_cons_loss = 0
            max_cons_win = max(max_cons_win, cur_cons_win)
        else:
            cur_cons_loss += 1
            cur_cons_win = 0
            max_cons_loss = max(max_cons_loss, cur_cons_loss)

    total_fees = sum(t.fee_paid for t in trades)
    expectancy = (
        ((win_rate / 100.0) * avg_win) - (((100.0 - win_rate) / 100.0) * avg_loss)
        if total_trades > 0
        else 0.0
    )

    # Monthly returns calculation
    monthly_returns: Dict[str, float] = {}
    month_buckets: Dict[str, List[float]] = {}
    for pt in equity_curve:
        # timestamp is ISO8601 YYYY-MM
        m_key = pt.timestamp[:7]
        if m_key not in month_buckets:
            month_buckets[m_key] = []
        month_buckets[m_key].append(pt.equity)

    for m_key, eq_list in month_buckets.items():
        if len(eq_list) >= 2:
            m_ret = ((eq_list[-1] - eq_list[0]) / eq_list[0]) * 100.0
            monthly_returns[m_key] = round(m_ret, 2)
        else:
            monthly_returns[m_key] = 0.0

    summary = BacktestSummary(
        initial_capital=round(initial_cap, 2),
        final_equity=round(current_equity, 2),
        net_profit=round(net_profit, 2),
        net_profit_pct=round(net_profit_pct, 2),
        benchmark_return_pct=round(benchmark_ret, 2),
        alpha=round(alpha, 2),
        total_trades=total_trades,
        winning_trades=win_count,
        losing_trades=loss_count,
        win_rate_pct=round(win_rate, 2),
        profit_factor=round(min(profit_factor, 99.9), 2),
        max_drawdown_pct=round(max_dd_pct, 2),
        max_drawdown_amount=round(max_dd_amt, 2),
        sharpe_ratio=round(sharpe, 2),
        sortino_ratio=round(sortino, 2),
        avg_trade_pnl=round(avg_trade_pnl, 2),
        avg_win_pnl=round(avg_win, 2),
        avg_loss_pnl=round(avg_loss, 2),
        win_loss_ratio=round(win_loss_ratio, 2),
        max_consecutive_wins=max_cons_win,
        max_consecutive_losses=max_cons_loss,
        total_fees_paid=round(total_fees, 2),
        expectancy=round(expectancy, 2),
    )

    return BacktestResponse(
        success=True,
        strategy=req.strategy,
        symbol=req.symbol,
        timeframe=req.timeframe,
        summary=summary,
        equity_curve=equity_curve,
        trades=trades,
        monthly_returns=monthly_returns,
    )
