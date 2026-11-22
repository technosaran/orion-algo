import json
import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_all_backtests():
    print("=" * 80)
    print("       ALGOX COMPREHENSIVE MULTI-STRATEGY BACKTEST EXECUTION ENGINE      ")
    print("=" * 80)

    test_runs = [
        {
            "name": "NIFTY 50 EMA Momentum Scalper (9/21 EMA)",
            "strategy": "ema_crossover",
            "symbol": "NIFTY50",
            "timeframe": "15m",
            "initial_capital": 200000.0,
            "date_range_days": 90,
            "slippage_pct": 0.02,
            "fee_pct": 0.03,
            "stop_loss_pct": 0.8,
            "take_profit_pct": 2.0,
            "trailing_stop_pct": 0.5,
            "strategy_params": {"fast_period": 9, "slow_period": 21}
        },
        {
            "name": "BANKNIFTY MACD Trend Following",
            "strategy": "macd_trend",
            "symbol": "BANKNIFTY",
            "timeframe": "15m",
            "initial_capital": 300000.0,
            "date_range_days": 90,
            "slippage_pct": 0.03,
            "fee_pct": 0.03,
            "stop_loss_pct": 1.0,
            "take_profit_pct": 2.5,
            "trailing_stop_pct": 0.6,
            "strategy_params": {"fast_period": 12, "slow_period": 26, "signal_period": 9}
        },
        {
            "name": "RELIANCE RSI Mean Reversion (30/70)",
            "strategy": "rsi_momentum",
            "symbol": "RELIANCE",
            "timeframe": "1h",
            "initial_capital": 150000.0,
            "date_range_days": 120,
            "slippage_pct": 0.02,
            "fee_pct": 0.02,
            "stop_loss_pct": 1.5,
            "take_profit_pct": 3.5,
            "trailing_stop_pct": 1.0,
            "strategy_params": {"rsi_period": 14, "oversold": 30, "overbought": 70}
        },
        {
            "name": "HDFCBANK Bollinger Bands Breakout",
            "strategy": "bollinger_bands",
            "symbol": "HDFCBANK",
            "timeframe": "1h",
            "initial_capital": 150000.0,
            "date_range_days": 120,
            "slippage_pct": 0.02,
            "fee_pct": 0.02,
            "stop_loss_pct": 1.2,
            "take_profit_pct": 3.0,
            "trailing_stop_pct": 0.8,
            "strategy_params": {"bb_period": 20, "bb_std": 2.0}
        },
        {
            "name": "BTC/USDT SMA Golden Cross (50/200)",
            "strategy": "sma_crossover",
            "symbol": "BTC/USDT",
            "timeframe": "4h",
            "initial_capital": 10000.0,
            "date_range_days": 180,
            "slippage_pct": 0.05,
            "fee_pct": 0.075,
            "stop_loss_pct": 3.0,
            "take_profit_pct": 8.0,
            "trailing_stop_pct": 2.0,
            "strategy_params": {"fast_period": 20, "slow_period": 50}
        }
    ]

    all_results = []

    for run in test_runs:
        print(f"\n▶ Executing: {run['name']} [{run['symbol']} • {run['timeframe']}]...")
        res = client.post("/api/v1/backtest/run", json=run)
        
        if res.status_code == 200:
            data = res.json()
            summary = data.get("summary", {})
            trades = data.get("trades", [])

            net_pnl = summary.get("net_profit", 0.0)
            return_pct = summary.get("net_profit_pct", 0.0)
            win_rate = summary.get("win_rate_pct", 0.0)
            total_trades = summary.get("total_trades", 0)
            profit_factor = summary.get("profit_factor", 0.0)
            sharpe = summary.get("sharpe_ratio", 0.0)
            sortino = summary.get("sortino_ratio", 0.0)
            max_dd = summary.get("max_drawdown_pct", 0.0)
            fees = summary.get("total_fees_paid", 0.0)
            benchmark = summary.get("benchmark_return_pct", 0.0)
            alpha = summary.get("alpha", 0.0)

            all_results.append({
                "name": run["name"],
                "symbol": run["symbol"],
                "timeframe": run["timeframe"],
                "initial_capital": run["initial_capital"],
                "final_equity": summary.get("final_equity", run["initial_capital"]),
                "net_profit": net_pnl,
                "return_pct": return_pct,
                "benchmark_return_pct": benchmark,
                "alpha": alpha,
                "win_rate_pct": win_rate,
                "total_trades": total_trades,
                "winning_trades": summary.get("winning_trades", 0),
                "losing_trades": summary.get("losing_trades", 0),
                "profit_factor": profit_factor,
                "sharpe_ratio": sharpe,
                "sortino_ratio": sortino,
                "max_drawdown_pct": max_dd,
                "total_fees_paid": fees,
                "recent_trades": trades[-3:] if trades else []
            })

            print(f"   ✓ Return: {return_pct:+.2f}% (Net: ₹{net_pnl:,.2f}) | Win Rate: {win_rate:.1f}% ({summary.get('winning_trades')}/{total_trades})")
            print(f"   ✓ Sharpe: {sharpe:.2f} | Sortino: {sortino:.2f} | Profit Factor: {profit_factor:.2f} | Max DD: {max_dd:.2f}% | Alpha: {alpha:+.2f}%")
        else:
            print(f"   ✗ Error: {res.text}")

    # Write results to file
    with open("detailed_backtest_results.json", "w") as f:
        json.dump(all_results, f, indent=2)

    print("\n" + "=" * 80)
    print("                           FINAL INSTITUTIONAL AUDIT                           ")
    print("=" * 80)
    print(f"{'Strategy':<36} | {'Return':<9} | {'Win Rate':<8} | {'Trades':<6} | {'Profit Factor':<13} | {'Max DD':<7}")
    print("-" * 88)
    for r in all_results:
        print(f"{r['name'][:34]:<36} | {r['return_pct']:>+7.2f}% | {r['win_rate_pct']:>6.1f}% | {r['total_trades']:>6} | {r['profit_factor']:>13.2f} | {r['max_drawdown_pct']:>6.2f}%")
    print("=" * 80)

if __name__ == "__main__":
    run_all_backtests()
