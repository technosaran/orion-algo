"""
Verification script for all Orion Algo backend endpoints.
"""

import sys
import asyncio
from fastapi.testclient import TestClient

sys.path.insert(0, "c:/Users/saran/Desktop/algoX/backend")
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("==================================================")
    print("Testing Orion Algo Institutional Backend Services")
    print("==================================================")

    # 1. Health
    r = client.get("/api/v1/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("[PASS] 1. /api/v1/health ->", r.json())

    # 2. Market Status (IST Session)
    r = client.get("/api/v1/market-data/market-status")
    assert r.status_code == 200, f"Market status failed: {r.text}"
    print("[PASS] 2. /api/v1/market-data/market-status ->", r.json()["timeIST"], f"({r.json()['session']})")

    # 3. Market Quotes (Indian + Global)
    r = client.get("/api/v1/market-data/quotes")
    assert r.status_code == 200, f"Quotes failed: {r.text}"
    quotes = r.json()["quotes"]
    print(f"[PASS] 3. /api/v1/market-data/quotes -> Fetched {len(quotes)} real quotes. Sample:", quotes[0]["symbol"], "=", quotes[0]["price"])

    # 4. Strategy Templates (All 6 Indian strategies)
    r = client.get("/api/v1/strategies/templates")
    assert r.status_code == 200, f"Templates failed: {r.text}"
    templates = r.json()
    assert len(templates) >= 6, f"Expected 6 templates, got {len(templates)}"
    print(f"[PASS] 4. /api/v1/strategies/templates -> Returned {len(templates)} Indian market templates:")
    for t in templates:
        print(f"   - {t['name']} ({t['segment']})")

    # 5. Paper Trading Account
    r = client.get("/api/v1/paper-trading/account")
    assert r.status_code == 200, f"Paper account failed: {r.text}"
    print("[PASS] 5. /api/v1/paper-trading/account -> Balance ₹", r.json().get("cash_balance"))

    # 6. Paper Trading Matching Engine Tick
    r = client.post("/api/v1/paper-trading/tick")
    assert r.status_code == 200, f"Paper tick failed: {r.text}"
    print("[PASS] 6. /api/v1/paper-trading/tick ->", r.json())

    # 7. Live Trading Status & RMS
    r = client.get("/api/v1/live/status")
    assert r.status_code == 200, f"Live status failed: {r.text}"
    print("[PASS] 7. /api/v1/live/status -> Kill Switch:", r.json()["killSwitchTripped"], "| Max Daily Loss:", r.json()["maxDailyLossLimit"])

    # 8. Dynamic Visual Strategy Backtest (Custom Indicators)
    custom_strategy = {
        "id": "strat-verify",
        "name": "NIFTY Supertrend Test",
        "category": "momentum",
        "assetClass": "nse_fno",
        "symbol": "NIFTY50",
        "productType": "MIS",
        "currency": "INR",
        "timeframe": "15m",
        "direction": "long",
        "orderType": "market",
        "initialCapital": 100000,
        "entryGroups": [
            {
                "id": "g1",
                "logic": "AND",
                "conditions": [
                    {
                        "id": "c1",
                        "leftIndicator": {"id": "i1", "type": "PRICE_CLOSE", "offset": 1},
                        "operator": "greater_than",
                        "compareType": "indicator",
                        "rightIndicator": {"id": "i2", "type": "EMA", "params": {"period": 20}, "offset": 1}
                    }
                ]
            }
        ],
        "customExitEnabled": False,
        "exitGroups": [],
        "riskManagement": {
            "stopLossType": "percentage",
            "stopLossValue": 1.0,
            "takeProfitType": "percentage",
            "takeProfitValue": 2.5,
            "useTrailingStop": True,
            "trailingStopActivation": 1.2,
            "trailingStopStep": 0.5,
            "intradaySquareOff": True,
            "squareOffTime": "15:15",
            "maxHoldingBars": 36,
            "maxDailyDrawdownPct": 3.0,
            "maxConsecutiveLosses": 3
        },
        "positionSizing": {
            "sizingType": "lots",
            "sizingValue": 1,
            "lotSize": 65,
            "maxOpenPositions": 1,
            "maxLeverage": 1,
            "slippagePct": 0.02,
            "feePerOrder": 20,
            "sttTaxPct": 0.0125
        },
        "status": "draft",
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
    }
    r = client.post("/api/v1/strategies/backtest", json=custom_strategy)
    assert r.status_code == 200, f"Dynamic backtest failed: {r.text}"
    bt = r.json()
    print("[PASS] 8. /api/v1/strategies/backtest -> Dynamic Condition Evaluation Complete:")
    print("   - Net Profit: ₹", bt["metrics"]["netProfit"])
    print("   - Win Rate:", bt["metrics"]["winRate"], "%")
    print("   - Total Trades:", bt["metrics"]["totalTrades"])
    print("   - Total Brokerage & Taxes Paid: ₹", bt["metrics"]["totalBrokeragePaid"])

    print("==================================================")
    print("ALL 8 INSTITUTIONAL BACKEND VERIFICATION CHECKS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    test_endpoints()
