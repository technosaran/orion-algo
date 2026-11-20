# Orion Algo — Indian Market Algorithmic Trading Platform (NSE / BSE / MCX)

Orion Algo is an institutional-grade, full-stack algorithmic trading system built specifically for Indian financial markets (NSE Equities, NSE F&O Indices/Options, and MCX Commodities).

---

## 🚀 Key Features

1. **Multi-Strategy Suite (6 Pre-Built Battle-Tested Indian Strategies)**:
   - **NIFTY 50 Intraday VWAP + Supertrend** (5-minute Trend Continuation)
   - **BANKNIFTY 9/21 EMA Momentum Scalper** (3-minute Options Scalping)
   - **RELIANCE 20-Period High Breakout** (15-minute Volume Breakout)
   - **CRUDEOIL MCX Positional Trend Following** (1-hour NRML Swing)
   - **NIFTY 50 Golden Cross Macro Swing** (1-hour 50/200 EMA)
   - **NIFTY 9:20 AM Options Theta Scalp** (1-minute Morning Volatility Contraction)

2. **Visual Rule-Builder & Code Export**:
   - Create complex multi-indicator strategies with nested `AND`/`OR` logic groups.
   - Dynamic indicators supported: SMA, EMA, RSI, Bollinger Bands, ATR, Supertrend, VWAP, MACD, Stochastic, Volume SMA.
   - Export strategies directly to Python, Pine Script, and JSON.

3. **NSE Live Terminal & Real-Time Options Feed**:
   - Live derivatives option chain (NIFTY, BANKNIFTY, FINNIFTY, STOCKS) with real-time Calls/Puts Open Interest, IV, PCR ratio, and Max Pain calculations.
   - Institutional FII/DII daily cash and F&O net flows tracker.
   - Top Gainers, Losers, and Volume Shockers.
   - Institutional Bulk & Block Deals live scanner.
   - Corporate actions calendar (Dividends, Splits, Bonus issues).

4. **Options Strategy Lab & Expiration Payoff Curves**:
   - Multi-leg strategy builder (Straddle, Strangle, Iron Condor, Iron Butterfly, Bull/Bear Spreads).
   - Interactive expiration payoff curve chart with dynamic breakevens and profit/loss zones.
   - Black-Scholes Greeks calculator (Delta, Gamma, Theta, Vega, Rho, Implied Volatility).
   - One-click basket deployment to paper trading or broker gateway.

5. **Institutional Stock Screener & Pattern Engine**:
   - Multi-condition technical screener across 50+ Indian NSE equities.
   - Presets for Golden Cross (50 > 200 EMA), RSI Oversold Reversals, Momentum Breakouts, and Supertrend flips.
   - One-click "Build Algo" navigation from screen results.

6. **Performance Analytics & Trader Diary**:
   - Monthly returns calendar heatmap with day-by-day and month-by-month win/loss metrics.
   - Quantitative risk analytics: Profit Factor, Sharpe Ratio, Sortino Ratio, Max Drawdown %.
   - Psychological Trade Journal with setup tags, discipline ratings, and self-review notes.

7. **Alerts Sentinel & TradingView Webhook Bridge**:
   - Real-time price threshold & RSI condition triggers.
   - Seamless TradingView Webhook Bridge to receive Pine Script webhook signals and execute them live with RMS guards.

8. **Institutional Backtesting Engine**:
   - Real historical candlestick feeds for Indian instruments (`NIFTY50`, `BANKNIFTY`, `SENSEX`, `RELIANCE`, `HDFCBANK`, `TCS`, `INFY`, `ICICIBANK`, `SBIN`, `TATAMOTORS`, `CRUDEOIL`, `GOLD`).
   - Supports both **LONG** and **SHORT** positions.
   - Incorporates realistic Indian market regulatory charges: Flat ₹20 Zerodha/Angel brokerage, STT (Securities Transaction Tax), NSE exchange turnover fees, 18% GST, and SEBI turnover charges.
   - Automated performance metrics: CAGR, Sharpe Ratio, Sortino Ratio, Max Drawdown %, Win Rate %, Trade Ledger.

4. **Autonomous Server-Side Paper Trading**:
   - Background daemon engine running 24/7 or during NSE market hours (9:15 AM - 3:30 PM IST).
   - Server-side order matching: Matches `PENDING` LIMIT orders and executes Take Profit / Stop Loss triggers.
   - Real-time mark-to-market unrealized and realized P&L tracking synced with Supabase cloud database.

5. **Live Broker Integration & Institutional RMS (Risk Management System)**:
   - **Angel One SmartAPI**: Automated TOTP 2FA login via `pyotp` (no manual morning authenticator codes needed!).
   - **Zerodha Kite Connect**: Full REST session connector.
   - **Pre-Trade RMS Guards**: Max Daily Loss Limit (₹10,000 ceiling), Max capital per trade (20%), Max open positions limit, and 3:15 PM IST MIS auto square-off.
   - **Emergency Kill Switch**: Instant one-click panic button that cancels all pending orders and market-exits all open positions across brokers.

---

## 🛠️ Quick Start Guide

### 1. Install & Setup Environment

#### Prerequisites
- Node.js 18+ & npm
- Python 3.12+

#### Install Frontend Dependencies
```bash
npm install
```

#### Install Backend Dependencies
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cd ..
```

---

### 2. Running the System

You can run both the Next.js frontend and the FastAPI backend side-by-side:

#### Terminal 1 — Start the Python FastAPI Backend (Port 8000):
```bash
npm run dev:backend
```
*(Backend API Docs will be live at: [http://localhost:8000/docs](http://localhost:8000/docs))*

#### Terminal 2 — Start the Next.js Web Dashboard (Port 3000):
```bash
npm run dev:frontend
```
*(Web Dashboard will be live at: [http://localhost:3000](http://localhost:3000))*

---

### 3. Running Backend Tests & Verifications
Run the automated institutional verification suite:
```bash
npm run test:backend
```

---

## 📊 Terminal Navigation Guide

| Page | URL | Purpose |
|---|---|---|
| **Dashboard** | `http://localhost:3000/` | Portfolio overview, market heatmap, real-time index tickers. |
| **NSE Live Terminal** | `http://localhost:3000/nse-terminal` | Live Options Chain, FII/DII institutional flows, Bulk Deals, Corporate Actions. |
| **Options Lab** | `http://localhost:3000/options-lab` | Multi-leg strategy builder, expiration payoff charts, Black-Scholes Greeks. |
| **Stock Screener** | `http://localhost:3000/screener` | Multi-condition technical screener (Golden Cross, RSI, Supertrend). |
| **Strategy Builder** | `http://localhost:3000/strategy-builder` | Visual rule creation, indicator tuning, and instant backtesting. |
| **Backtesting Terminal** | `http://localhost:3000/backtesting` | Presets, equity curve chart, monthly returns, trade execution log. |
| **Paper Trading** | `http://localhost:3000/paper-trading` | Live order ticket, positions table, automated algo bot controller. |
| **Live Trading & RMS** | `http://localhost:3000/live-trading` | Broker connection (Angel One/Zerodha), RMS limits, and Emergency Kill Switch. |
| **Performance & Journal** | `http://localhost:3000/analytics` | Monthly returns calendar heatmap, drawdown chart, trader psychology diary. |
| **Alerts & Signals** | `http://localhost:3000/alerts` | Price alerts and TradingView webhook signal bridge. |
| **Market Data Hub** | `http://localhost:3000/data` | Historical datasets, CSV uploader, candlestick data inspector. |
| **System Settings** | `http://localhost:3000/settings` | API keys, RMS limits, Telegram bot notifications. |

---

## 🔒 Security & SEBI Compliance

- Broker API keys and TOTP tokens are held securely in environment variables.
- Orders pass through pre-trade RMS validation before reaching exchange gateways.
- 3:15 PM IST auto square-off guards ensure zero overnight carry risk for intraday (MIS) trades.
