import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_nse_terminal_endpoints():
    print("\n--- Verifying New NSE Terminal Endpoints ---")
    
    # 1. Market Status
    res = client.get("/api/v1/nse/market-status")
    assert res.status_code == 200, f"market-status failed: {res.text}"
    print(f"[PASS] /api/v1/nse/market-status -> {len(res.json().get('marketState', []))} market states")

    # 2. Indices
    res = client.get("/api/v1/nse/indices")
    assert res.status_code == 200, f"indices failed: {res.text}"
    print(f"[PASS] /api/v1/nse/indices -> {len(res.json().get('data', []))} indices returned")

    # 3. FII / DII
    res = client.get("/api/v1/nse/fii-dii")
    assert res.status_code == 200, f"fii-dii failed: {res.text}"
    print(f"[PASS] /api/v1/nse/fii-dii -> Net FII: {res.json().get('fii', {}).get('netValue')} Cr")

    # 4. Option Chain
    res = client.get("/api/v1/nse/option-chain/NIFTY")
    assert res.status_code == 200, f"option-chain failed: {res.text}"
    records = res.json().get("records", {})
    print(f"[PASS] /api/v1/nse/option-chain/NIFTY -> Spot: {records.get('underlyingValue')} | PCR: {records.get('pcr')} | Rows: {len(records.get('data', []))}")

    # 5. Gainers / Losers
    res = client.get("/api/v1/nse/gainers-losers")
    assert res.status_code == 200, f"gainers-losers failed: {res.text}"
    print(f"[PASS] /api/v1/nse/gainers-losers -> Gainers: {len(res.json().get('gainers', []))} | Losers: {len(res.json().get('losers', []))}")

    # 6. Bulk Deals
    res = client.get("/api/v1/nse/bulk-deals")
    assert res.status_code == 200, f"bulk-deals failed: {res.text}"
    print(f"[PASS] /api/v1/nse/bulk-deals -> {len(res.json())} bulk deals")

    # 7. Corporate Actions
    res = client.get("/api/v1/nse/corporate-actions")
    assert res.status_code == 200, f"corporate-actions failed: {res.text}"
    print(f"[PASS] /api/v1/nse/corporate-actions -> {len(res.json())} corporate actions")


def test_options_lab_endpoints():
    print("\n--- Verifying Options Lab Analytical Endpoints ---")
    
    # 1. Black-Scholes Greeks
    res = client.post("/api/v1/options/greeks", json={
        "spot": 24350,
        "strike": 24350,
        "days_to_expiry": 7,
        "risk_free_rate": 0.07,
        "iv": 0.13,
        "option_type": "CE"
    })
    assert res.status_code == 200, f"greeks failed: {res.text}"
    g = res.json()
    print(f"[PASS] /api/v1/options/greeks -> Price: ₹{g['price']} | Delta: {g['delta']} | Theta: {g['theta']} | Gamma: {g['gamma']}")

    # 2. Multi-leg Payoff Curve
    res = client.post("/api/v1/options/payoff", json={
        "spot": 24350,
        "legs": [
            {"strike": 24200, "type": "PE", "action": "BUY", "premium": 25, "lots": 1, "lot_size": 65},
            {"strike": 24300, "type": "PE", "action": "SELL", "premium": 60, "lots": 1, "lot_size": 65},
            {"strike": 24400, "type": "CE", "action": "SELL", "premium": 65, "lots": 1, "lot_size": 65},
            {"strike": 24500, "type": "CE", "action": "BUY", "premium": 28, "lots": 1, "lot_size": 65},
        ]
    })
    assert res.status_code == 200, f"payoff failed: {res.text}"
    p = res.json()
    print(f"[PASS] /api/v1/options/payoff -> Max Profit: ₹{p['maxProfit']} | Max Loss: ₹{p['maxLoss']} | Breakevens: {p['breakevens']}")

    # 3. Max Pain
    res = client.post("/api/v1/options/max-pain", json={
        "strikes": [24200, 24250, 24300, 24350, 24400, 24450, 24500],
        "call_ois": [10000, 20000, 50000, 120000, 90000, 70000, 40000],
        "put_ois": [45000, 65000, 110000, 115000, 60000, 30000, 15000]
    })
    assert res.status_code == 200, f"max-pain failed: {res.text}"
    print(f"[PASS] /api/v1/options/max-pain -> Max Pain Strike: ₹{res.json()['maxPainStrike']}")

if __name__ == "__main__":
    test_nse_terminal_endpoints()
    test_options_lab_endpoints()
    print("\n==================================================")
    print("ALL NEW INSTITUTIONAL MODULE VERIFICATIONS PASSED!")
    print("==================================================")
