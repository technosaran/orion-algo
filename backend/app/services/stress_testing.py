"""
Orion Algo - Quantitative Stress Testing & Monte Carlo Engine
Audits strategy robustness against sequence-of-returns risk, market regime shifts, and tail drawdowns.
"""

import math
import random
from typing import Dict, Any, List, Optional


def run_monte_carlo_drawdown_simulation(
    trades: List[Dict[str, Any]],
    initial_capital: float = 100000.0,
    iterations: int = 1000,
    ruin_threshold_pct: float = 25.0,  # 25% drawdown considered "ruin" for institutional prop desks
    seed: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Shuffles trade return sequences across 500-2,500 iterations.
    Estimates sequence-of-returns risk, extreme tail drawdowns, VaR, and ruin probability.
    """
    if not trades:
        return {
            "iterations": iterations,
            "max_drawdown_p50": 0.0,
            "max_drawdown_p95": 0.0,
            "max_drawdown_p99": 0.0,
            "probability_of_ruin": 0.0,
            "var_95": 0.0,
        }

    rng = random.Random(seed)
    pnl_list = [float(t.get("pnl", 0.0)) for t in trades]

    simulated_max_drawdowns: List[float] = []
    final_equities: List[float] = []
    ruin_count = 0

    for _ in range(iterations):
        # Bootstrap resampling with replacement for robust empirical distribution
        resampled_pnl = [rng.choice(pnl_list) for _ in range(len(pnl_list))]

        equity = initial_capital
        peak = initial_capital
        max_dd = 0.0

        for pnl in resampled_pnl:
            equity += pnl
            if equity > peak:
                peak = equity
            dd = (peak - equity) / peak if peak > 0 else 0.0
            if dd > max_dd:
                max_dd = dd

        simulated_max_drawdowns.append(max_dd)
        final_equities.append(equity)

        if max_dd >= (ruin_threshold_pct / 100.0):
            ruin_count += 1

    simulated_max_drawdowns.sort()
    final_equities.sort()

    idx_50 = int(iterations * 0.50)
    idx_95 = int(iterations * 0.95)
    idx_99 = int(iterations * 0.99)
    idx_var = int(iterations * 0.05)

    worst_5pct_equity = final_equities[idx_var]
    var_95 = max(0.0, initial_capital - worst_5pct_equity)

    return {
        "iterations": iterations,
        "sample_trades_count": len(trades),
        "initial_capital": initial_capital,
        "max_drawdown_p50": round(simulated_max_drawdowns[idx_50] * 100.0, 2),
        "max_drawdown_p95": round(simulated_max_drawdowns[idx_95] * 100.0, 2),
        "max_drawdown_p99": round(simulated_max_drawdowns[idx_99] * 100.0, 2),
        "probability_of_ruin": round((ruin_count / iterations) * 100.0, 2),
        "var_95": round(var_95, 2),
    }


def run_walk_forward_split(
    candles: List[Dict[str, Any]],
    train_ratio: float = 0.70,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Partitions time-series candles into in-sample (train) and out-of-sample (test) sets.
    Prevents curve-fitting and validates strategy performance across unseen market regimes.
    """
    if not candles:
        return {"train": [], "test": []}

    split_idx = int(len(candles) * train_ratio)
    return {
        "train": candles[:split_idx],
        "test": candles[split_idx:],
    }


def compute_institutional_ratios(
    trades: List[Dict[str, Any]],
    initial_capital: float,
    risk_free_rate: float = 0.068,  # RBI 91-day T-Bill ~6.8%
) -> Dict[str, float]:
    """
    Computes Sharpe, Sortino, and Profit Factor based on trade outcomes.
    Incorporates Indian benchmark risk-free rate.
    """
    if not trades or initial_capital <= 0:
        return {"sharpe": 0.0, "sortino": 0.0, "profit_factor": 0.0}

    gross_profits = sum(t["pnl"] for t in trades if t["pnl"] > 0)
    gross_losses = sum(abs(t["pnl"]) for t in trades if t["pnl"] < 0)
    profit_factor = (gross_profits / gross_losses) if gross_losses > 0 else 99.0

    returns = [t["pnl"] / initial_capital for t in trades]
    avg_ret = sum(returns) / len(returns)
    excess_ret = avg_ret - (risk_free_rate / 252.0)

    # Standard deviation of returns
    var = sum((r - avg_ret) ** 2 for r in returns) / len(returns) if len(returns) > 1 else 0.0
    std = math.sqrt(var)

    # Downside deviation for Sortino
    downside_var = sum((min(0.0, r) ** 2) for r in returns) / len(returns) if len(returns) > 0 else 0.0
    downside_std = math.sqrt(downside_var)

    annual_factor = math.sqrt(252)
    sharpe = (excess_ret / std * annual_factor) if std > 0 else 0.0
    sortino = (excess_ret / downside_std * annual_factor) if downside_std > 0 else 0.0

    return {
        "sharpe": round(sharpe, 2),
        "sortino": round(sortino, 2),
        "profit_factor": round(profit_factor, 2),
    }
