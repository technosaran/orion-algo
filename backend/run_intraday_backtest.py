import json
from app.services.backtest_engine import (
    BacktestRequest,
    run_backtest_simulation,
    generate_candles
)

def run_intraday_study():
    print("=" * 85)
    print("      ALGOX HIGH-RESOLUTION INTRADAY & SWING QUANTITATIVE BACKTEST AUDIT      ")
    print("=" * 85)

    scenarios = [
        {
            "name": "NIFTY 50 9/21 EMA Momentum Scalper",
            "req": BacktestRequest(
                strategy="ema_crossover",
                symbol="NIFTY50",
                timeframe="5m",
                initial_capital=200000.0,
                date_range_days=45,
                slippage_pct=0.015,
                fee_pct=0.03,
                leverage=1.0,
                stop_loss_pct=0.6,
                take_profit_pct=1.5,
                trailing_stop_pct=0.3,
                strategy_params={"fast_period": 9, "slow_period": 21}
            )
        },
        {
            "name": "BANKNIFTY MACD Momentum Trend (15m)",
            "req": BacktestRequest(
                strategy="macd_trend",
                symbol="BANKNIFTY",
                timeframe="15m",
                initial_capital=300000.0,
                date_range_days=60,
                slippage_pct=0.02,
                fee_pct=0.03,
                leverage=1.0,
                stop_loss_pct=0.8,
                take_profit_pct=2.2,
                trailing_stop_pct=0.5,
                strategy_params={"fast_period": 12, "slow_period": 26, "signal_period": 9}
            )
        },
        {
            "name": "RELIANCE 20-EMA Pullback & Breakout (15m)",
            "req": BacktestRequest(
                strategy="sma_crossover",
                symbol="RELIANCE",
                timeframe="15m",
                initial_capital=150000.0,
                date_range_days=60,
                slippage_pct=0.02,
                fee_pct=0.02,
                leverage=1.0,
                stop_loss_pct=1.0,
                take_profit_pct=2.8,
                trailing_stop_pct=0.6,
                strategy_params={"fast_period": 10, "slow_period": 30}
            )
        },
        {
            "name": "CRUDEOIL MCX Positional Trend Following",
            "req": BacktestRequest(
                strategy="ema_crossover",
                symbol="CRUDEOIL",
                timeframe="1h",
                initial_capital=250000.0,
                date_range_days=90,
                slippage_pct=0.03,
                fee_pct=0.025,
                leverage=1.0,
                stop_loss_pct=1.5,
                take_profit_pct=4.0,
                trailing_stop_pct=1.0,
                strategy_params={"fast_period": 12, "slow_period": 36}
            )
        }
    ]

    report = []

    for item in scenarios:
        name = item["name"]
        req = item["req"]
        print(f"\n▶ Testing: {name} ({req.symbol} • {req.timeframe} • {req.date_range_days} days)")
        
        result = run_backtest_simulation(req)
        s = result.summary

        report.append({
            "name": name,
            "symbol": req.symbol,
            "timeframe": req.timeframe,
            "initial_capital": s.initial_capital,
            "final_equity": s.final_equity,
            "net_profit": s.net_profit,
            "net_profit_pct": s.net_profit_pct,
            "benchmark_return_pct": s.benchmark_return_pct,
            "alpha": s.alpha,
            "total_trades": s.total_trades,
            "winning_trades": s.winning_trades,
            "losing_trades": s.losing_trades,
            "win_rate_pct": s.win_rate_pct,
            "profit_factor": s.profit_factor,
            "sharpe_ratio": s.sharpe_ratio,
            "sortino_ratio": s.sortino_ratio,
            "max_drawdown_pct": s.max_drawdown_pct,
            "avg_trade_pnl": s.avg_trade_pnl,
            "avg_win_pnl": s.avg_win_pnl,
            "avg_loss_pnl": s.avg_loss_pnl,
            "win_loss_ratio": s.win_loss_ratio,
            "total_fees_paid": s.total_fees_paid,
            "trades": [t.model_dump() for t in result.trades[:5]]
        })

        print(f"   ✓ Net Return: ₹{s.net_profit:,.2f} ({s.net_profit_pct:+.2f}%) | Alpha: {s.alpha:+.2f}%")
        print(f"   ✓ Win Rate: {s.win_rate_pct:.1f}% ({s.winning_trades}W / {s.losing_trades}L in {s.total_trades} trades)")
        print(f"   ✓ Profit Factor: {s.profit_factor:.2f} | Sharpe: {s.sharpe_ratio:.2f} | Sortino: {s.sortino_ratio:.2f}")
        print(f"   ✓ Max Drawdown: {s.max_drawdown_pct:.2f}% | Total Brokerage & STT: ₹{s.total_fees_paid:,.2f}")
        print(f"   ✓ Avg Win: ₹{s.avg_win_pnl:,.2f} | Avg Loss: ₹{s.avg_loss_pnl:,.2f}")

    with open("intraday_study_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 85)
    print("                          COMPREHENSIVE BACKTEST AUDIT MATRIX                          ")
    print("=" * 85)
    print(f"{'Strategy Setup':<38} | {'Return':<9} | {'Win Rate':<8} | {'Trades':<6} | {'Profit Factor':<13} | {'Max DD':<7}")
    print("-" * 90)
    for r in report:
        print(f"{r['name'][:36]:<38} | {r['net_profit_pct']:>+7.2f}% | {r['win_rate_pct']:>6.1f}% | {r['total_trades']:>6} | {r['profit_factor']:>13.2f} | {r['max_drawdown_pct']:>6.2f}%")
    print("=" * 85)

if __name__ == "__main__":
    run_intraday_study()
