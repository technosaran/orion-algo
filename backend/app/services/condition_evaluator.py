"""
Orion Algo - Dynamic Technical Indicator & Rule-Condition Evaluation Engine
Evaluates visual user-defined condition groups (AND/OR) with multi-indicator support.
"""

from typing import List, Dict, Any, Optional
import math


class IndicatorStore:
    """Computes and caches indicator time series for a sequence of OHLCV candles."""

    def __init__(self, candles: List[Dict[str, Any]]):
        self.candles = candles
        self.closes = [c["close"] for c in candles]
        self.opens = [c["open"] for c in candles]
        self.highs = [c["high"] for c in candles]
        self.lows = [c["low"] for c in candles]
        self.volumes = [c.get("volume", 0) for c in candles]
        self.cache: Dict[str, List[Optional[float]]] = {}

    def get_value(self, indicator: Dict[str, Any], bar_index: int) -> Optional[float]:
        offset = indicator.get("offset", 0)
        target_idx = bar_index - offset
        if target_idx < 0 or target_idx >= len(self.candles):
            return None

        itype = indicator.get("type", "PRICE_CLOSE")
        params = indicator.get("params", {})
        sub_field = indicator.get("subField", "")
        key = f"{itype}_{sorted(params.items())}_{sub_field}"

        if key not in self.cache:
            self._compute(key, itype, params, sub_field)

        series = self.cache[key]
        return series[target_idx] if target_idx < len(series) else None

    def _compute(self, key: str, itype: str, params: Dict[str, Any], sub_field: str):
        n = len(self.candles)
        if itype == "PRICE_CLOSE":
            self.cache[key] = [float(c) for c in self.closes]
        elif itype == "PRICE_OPEN":
            self.cache[key] = [float(o) for o in self.opens]
        elif itype == "PRICE_HIGH":
            self.cache[key] = [float(h) for h in self.highs]
        elif itype == "PRICE_LOW":
            self.cache[key] = [float(l) for l in self.lows]
        elif itype == "SMA":
            period = int(params.get("period", 20))
            self.cache[key] = self._calc_sma(self.closes, period)
        elif itype == "EMA":
            period = int(params.get("period", 20))
            self.cache[key] = self._calc_ema(self.closes, period)
        elif itype == "RSI":
            period = int(params.get("period", 14))
            self.cache[key] = self._calc_rsi(self.closes, period)
        elif itype == "BOLLINGER_BANDS":
            period = int(params.get("period", 20))
            std_dev = float(params.get("stdDev", 2.0))
            upper, middle, lower = self._calc_bollinger(self.closes, period, std_dev)
            if sub_field == "upper":
                self.cache[key] = upper
            elif sub_field == "lower":
                self.cache[key] = lower
            else:
                self.cache[key] = middle
        elif itype == "ATR":
            period = int(params.get("period", 14))
            self.cache[key] = self._calc_atr(period)
        elif itype == "SUPERTREND":
            period = int(params.get("period", 10))
            mult = float(params.get("multiplier", 3.0))
            st, trend_dir = self._calc_supertrend(period, mult)
            if sub_field == "direction":
                self.cache[key] = trend_dir
            else:
                self.cache[key] = st
        elif itype == "VWAP":
            self.cache[key] = self._calc_vwap()
        elif itype == "MACD":
            fast = int(params.get("fast", 12))
            slow = int(params.get("slow", 26))
            signal = int(params.get("signal", 9))
            macd_line, sig_line, hist = self._calc_macd(fast, slow, signal)
            if sub_field == "signal":
                self.cache[key] = sig_line
            elif sub_field == "hist":
                self.cache[key] = hist
            else:
                self.cache[key] = macd_line
        elif itype == "STOCHASTIC":
            period_k = int(params.get("periodK", 14))
            smooth_k = int(params.get("smoothK", 3))
            period_d = int(params.get("periodD", 3))
            k_line, d_line = self._calc_stochastic(period_k, smooth_k, period_d)
            self.cache[key] = d_line if sub_field == "d" else k_line
        elif itype == "VOLUME_SMA":
            period = int(params.get("period", 20))
            self.cache[key] = self._calc_sma(self.volumes, period)
        else:
            self.cache[key] = [float(c) for c in self.closes]

    def _calc_sma(self, data: List[float], period: int) -> List[Optional[float]]:
        res: List[Optional[float]] = []
        for i in range(len(data)):
            if i < period - 1:
                res.append(None)
            else:
                window = data[i - period + 1 : i + 1]
                res.append(sum(window) / period)
        return res

    def _calc_ema(self, data: List[float], period: int) -> List[Optional[float]]:
        res: List[Optional[float]] = []
        k = 2.0 / (period + 1.0)
        prev_ema: Optional[float] = None
        for i in range(len(data)):
            if i < period - 1:
                res.append(None)
            elif i == period - 1:
                prev_ema = sum(data[:period]) / period
                res.append(prev_ema)
            elif prev_ema is not None:
                prev_ema = data[i] * k + prev_ema * (1.0 - k)
                res.append(prev_ema)
        return res

    def _calc_rsi(self, data: List[float], period: int = 14) -> List[Optional[float]]:
        res: List[Optional[float]] = []
        avg_gain = 0.0
        avg_loss = 0.0
        for i in range(len(data)):
            if i == 0:
                res.append(None)
                continue
            diff = data[i] - data[i - 1]
            gain = max(diff, 0.0)
            loss = max(-diff, 0.0)

            if i < period:
                avg_gain += gain
                avg_loss += loss
                res.append(None)
            elif i == period:
                avg_gain = (avg_gain + gain) / period
                avg_loss = (avg_loss + loss) / period
                rs = avg_gain / avg_loss if avg_loss != 0 else 100.0
                res.append(100.0 - (100.0 / (1.0 + rs)))
            else:
                avg_gain = (avg_gain * (period - 1) + gain) / period
                avg_loss = (avg_loss * (period - 1) + loss) / period
                rs = avg_gain / avg_loss if avg_loss != 0 else 100.0
                res.append(100.0 - (100.0 / (1.0 + rs)))
        return res

    def _calc_bollinger(self, data: List[float], period: int = 20, std_dev: float = 2.0):
        middle = self._calc_sma(data, period)
        upper: List[Optional[float]] = []
        lower: List[Optional[float]] = []
        for i in range(len(data)):
            mid = middle[i]
            if mid is None:
                upper.append(None)
                lower.append(None)
            else:
                window = data[i - period + 1 : i + 1]
                variance = sum((x - mid) ** 2 for x in window) / period
                sd = math.sqrt(variance)
                upper.append(mid + std_dev * sd)
                lower.append(mid - std_dev * sd)
        return upper, middle, lower

    def _calc_atr(self, period: int = 14) -> List[Optional[float]]:
        trs: List[float] = []
        for i in range(len(self.candles)):
            if i == 0:
                trs.append(self.highs[0] - self.lows[0])
            else:
                hl = self.highs[i] - self.lows[i]
                hc = abs(self.highs[i] - self.closes[i - 1])
                lc = abs(self.lows[i] - self.closes[i - 1])
                trs.append(max(hl, hc, lc))
        return self._calc_sma(trs, period)

    def _calc_supertrend(self, period: int = 10, multiplier: float = 3.0):
        atr = self._calc_atr(period)
        st: List[Optional[float]] = []
        trend_direction: List[Optional[float]] = []  # 1 for up (bullish), -1 for down (bearish)
        in_uptrend = True

        for i in range(len(self.candles)):
            cur_atr = atr[i]
            if cur_atr is None:
                st.append(None)
                trend_direction.append(None)
                continue

            hl2 = (self.highs[i] + self.lows[i]) / 2.0
            upper_band = hl2 + multiplier * cur_atr
            lower_band = hl2 - multiplier * cur_atr

            if self.closes[i] > upper_band:
                in_uptrend = True
            elif self.closes[i] < lower_band:
                in_uptrend = False

            st.append(lower_band if in_uptrend else upper_band)
            trend_direction.append(1.0 if in_uptrend else -1.0)

        return st, trend_direction

    def _calc_vwap(self) -> List[Optional[float]]:
        res: List[Optional[float]] = []
        cum_vol = 0.0
        cum_vol_price = 0.0
        for i in range(len(self.candles)):
            typical = (self.highs[i] + self.lows[i] + self.closes[i]) / 3.0
            vol = max(self.volumes[i], 1.0)
            cum_vol += vol
            cum_vol_price += typical * vol
            res.append(cum_vol_price / cum_vol)
        return res

    def _calc_macd(self, fast: int = 12, slow: int = 26, signal: int = 9):
        fast_ema = self._calc_ema(self.closes, fast)
        slow_ema = self._calc_ema(self.closes, slow)
        macd_line: List[Optional[float]] = []
        for f, s in zip(fast_ema, slow_ema):
            if f is not None and s is not None:
                macd_line.append(f - s)
            else:
                macd_line.append(None)

        # Signal line is EMA of macd_line (filtering out None)
        valid_indices = [i for i, v in enumerate(macd_line) if v is not None]
        valid_values = [macd_line[i] for i in valid_indices if macd_line[i] is not None]
        sig_valid = self._calc_ema(valid_values, signal)

        sig_line: List[Optional[float]] = [None] * len(self.candles)
        hist: List[Optional[float]] = [None] * len(self.candles)
        for idx, s_val in zip(valid_indices, sig_valid):
            sig_line[idx] = s_val
            if s_val is not None and macd_line[idx] is not None:
                hist[idx] = macd_line[idx] - s_val

        return macd_line, sig_line, hist

    def _calc_stochastic(self, period_k: int = 14, smooth_k: int = 3, period_d: int = 3):
        raw_k: List[Optional[float]] = []
        for i in range(len(self.candles)):
            if i < period_k - 1:
                raw_k.append(None)
                continue
            window_high = max(self.highs[i - period_k + 1 : i + 1])
            window_low = min(self.lows[i - period_k + 1 : i + 1])
            span = window_high - window_low
            if span == 0:
                raw_k.append(50.0)
            else:
                raw_k.append(((self.closes[i] - window_low) / span) * 100.0)

        # Smooth K
        valid_k_idx = [i for i, v in enumerate(raw_k) if v is not None]
        valid_k_vals = [raw_k[i] for i in valid_k_idx if raw_k[i] is not None]
        smoothed_k = self._calc_sma(valid_k_vals, smooth_k)

        k_line: List[Optional[float]] = [None] * len(self.candles)
        for idx, v in zip(valid_k_idx, smoothed_k):
            k_line[idx] = v

        valid_smoothed_idx = [i for i, v in enumerate(k_line) if v is not None]
        valid_smoothed_vals = [k_line[i] for i in valid_smoothed_idx if k_line[i] is not None]
        d_vals = self._calc_sma(valid_smoothed_vals, period_d)

        d_line: List[Optional[float]] = [None] * len(self.candles)
        for idx, v in zip(valid_smoothed_idx, d_vals):
            d_line[idx] = v

        return k_line, d_line


def evaluate_single_condition(
    cond: Dict[str, Any], bar_idx: int, store: IndicatorStore
) -> bool:
    """Evaluates a single rule condition (e.g. Close crosses above EMA)."""
    if bar_idx < 1:
        return False

    left_ind = cond.get("leftIndicator", {})
    left_curr = store.get_value(left_ind, bar_idx)
    left_prev = store.get_value(left_ind, bar_idx - 1)

    compare_type = cond.get("compareType", "value")
    if compare_type == "value":
        right_val = float(cond.get("rightValue", 0))
        right_curr = right_val
        right_prev = right_val
    else:
        right_ind = cond.get("rightIndicator", {})
        right_curr = store.get_value(right_ind, bar_idx)
        right_prev = store.get_value(right_ind, bar_idx - 1)

    if left_curr is None or right_curr is None:
        return False

    op = cond.get("operator", "greater_than")
    if op == "crosses_above":
        return (
            left_prev is not None
            and right_prev is not None
            and left_prev <= right_prev
            and left_curr > right_curr
        )
    elif op == "crosses_below":
        return (
            left_prev is not None
            and right_prev is not None
            and left_prev >= right_prev
            and left_curr < right_curr
        )
    elif op == "greater_than":
        return left_curr > right_curr
    elif op == "less_than":
        return left_curr < right_curr
    elif op == "greater_than_or_equal":
        return left_curr >= right_curr
    elif op == "less_than_or_equal":
        return left_curr <= right_curr
    elif op == "equals":
        return abs(left_curr - right_curr) < 0.0001
    elif op == "between":
        val_a = float(cond.get("betweenValueA", 0))
        val_b = float(cond.get("betweenValueB", 100))
        lo, hi = min(val_a, val_b), max(val_a, val_b)
        return lo <= left_curr <= hi

    return False


def evaluate_condition_group(
    group: Dict[str, Any], bar_idx: int, store: IndicatorStore
) -> bool:
    """Evaluates a group of conditions connected with AND/OR logic."""
    conditions = group.get("conditions", [])
    if not conditions:
        return False

    logic = group.get("logic", "AND").upper()
    results = [evaluate_single_condition(c, bar_idx, store) for c in conditions]

    if logic == "AND":
        return all(results)
    else:  # OR
        return any(results)


def evaluate_entry_trigger(
    entry_groups: List[Dict[str, Any]], bar_idx: int, store: IndicatorStore
) -> bool:
    """Evaluates multiple condition groups. Top-level groups are combined with OR."""
    if not entry_groups:
        return False
    return any(evaluate_condition_group(g, bar_idx, store) for g in entry_groups)


def evaluate_exit_trigger(
    exit_groups: List[Dict[str, Any]], bar_idx: int, store: IndicatorStore
) -> bool:
    """Evaluates custom indicator exit conditions."""
    if not exit_groups:
        return False
    return any(evaluate_condition_group(g, bar_idx, store) for g in exit_groups)
