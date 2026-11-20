import math
from typing import Dict, Any, List

def norm_cdf(x: float) -> float:
    """Cumulative standard normal distribution approximation."""
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def norm_pdf(x: float) -> float:
    """Standard normal probability density function."""
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)

def calculate_greeks(
    spot: float,
    strike: float,
    days_to_expiry: float,
    risk_free_rate: float = 0.07,  # 7% Indian RBI Repo proxy
    iv: float = 0.15,               # 15% annualized
    option_type: str = "CE"
) -> Dict[str, float]:
    """Calculate Black-Scholes Option Price and Greeks."""
    t = max(days_to_expiry, 0.001) / 365.0
    r = risk_free_rate
    sigma = max(iv, 0.01)

    d1 = (math.log(spot / strike) + (r + 0.5 * sigma ** 2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)

    is_call = option_type.upper() in ["CE", "CALL"]

    if is_call:
        price = spot * norm_cdf(d1) - strike * math.exp(-r * t) * norm_cdf(d2)
        delta = norm_cdf(d1)
        theta = (
            -(spot * norm_pdf(d1) * sigma) / (2 * math.sqrt(t))
            - r * strike * math.exp(-r * t) * norm_cdf(d2)
        ) / 365.0
        rho = (strike * t * math.exp(-r * t) * norm_cdf(d2)) / 100.0
    else:
        price = strike * math.exp(-r * t) * norm_cdf(-d2) - spot * norm_cdf(-d1)
        delta = norm_cdf(d1) - 1.0
        theta = (
            -(spot * norm_pdf(d1) * sigma) / (2 * math.sqrt(t))
            + r * strike * math.exp(-r * t) * norm_cdf(-d2)
        ) / 365.0
        rho = (-strike * t * math.exp(-r * t) * norm_cdf(-d2)) / 100.0

    gamma = norm_pdf(d1) / (spot * sigma * math.sqrt(t))
    vega = (spot * math.sqrt(t) * norm_pdf(d1)) / 100.0  # Per 1% IV change

    return {
        "price": round(price, 2),
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "theta": round(theta, 2),
        "vega": round(vega, 2),
        "rho": round(rho, 4),
        "iv": round(sigma * 100, 2),
    }

def calculate_multi_leg_payoff(
    spot: float,
    legs: List[Dict[str, Any]],
    price_range_pct: float = 0.08,
    steps: int = 50
) -> Dict[str, Any]:
    """
    Calculate payoff curve across underlying spot price range.
    legs: [{'strike': 24300, 'type': 'CE', 'action': 'BUY', 'premium': 110.0, 'lots': 1, 'lot_size': 65}]
    """
    min_price = spot * (1.0 - price_range_pct)
    max_price = spot * (1.0 + price_range_pct)
    step_size = (max_price - min_price) / steps

    prices = [round(min_price + i * step_size, 1) for i in range(steps + 1)]
    payoff_curve = []
    
    net_debit_credit = 0.0
    for leg in legs:
        lot_size = leg.get("lot_size", 65)
        lots = leg.get("lots", 1)
        premium = leg.get("premium", 0.0)
        action = leg.get("action", "BUY").upper()
        
        sign = -1.0 if action == "BUY" else 1.0
        net_debit_credit += sign * premium * lots * lot_size

    for p in prices:
        total_pnl = 0.0
        for leg in legs:
            strike = leg["strike"]
            opt_type = leg.get("type", "CE").upper()
            action = leg.get("action", "BUY").upper()
            premium = leg.get("premium", 0.0)
            lot_size = leg.get("lot_size", 65)
            qty = leg.get("lots", 1) * lot_size

            # Intrinsic value at expiration
            if opt_type in ["CE", "CALL"]:
                intrinsic = max(0.0, p - strike)
            else:
                intrinsic = max(0.0, strike - p)

            if action == "BUY":
                leg_pnl = (intrinsic - premium) * qty
            else:
                leg_pnl = (premium - intrinsic) * qty
            total_pnl += leg_pnl

        payoff_curve.append({"spotPrice": p, "pnl": round(total_pnl, 2)})

    pnls = [pt["pnl"] for pt in payoff_curve]
    max_profit = max(pnls)
    max_loss = min(pnls)

    # Calculate breakevens
    breakevens = []
    for i in range(len(payoff_curve) - 1):
        p1 = payoff_curve[i]
        p2 = payoff_curve[i + 1]
        if (p1["pnl"] <= 0 and p2["pnl"] >= 0) or (p1["pnl"] >= 0 and p2["pnl"] <= 0):
            # linear interpolation
            denom = (p2["pnl"] - p1["pnl"]) or 1e-5
            frac = (0 - p1["pnl"]) / denom
            be = round(p1["spotPrice"] + frac * (p2["spotPrice"] - p1["spotPrice"]), 1)
            breakevens.append(be)

    return {
        "payoffCurve": payoff_curve,
        "maxProfit": round(max_profit, 2) if max_profit < 1e7 else "UNLIMITED",
        "maxLoss": round(max_loss, 2) if max_loss > -1e7 else "UNLIMITED",
        "netPremium": round(net_debit_credit, 2),
        "breakevens": breakevens,
    }

def calculate_max_pain(strikes: List[float], call_ois: List[int], put_ois: List[int]) -> float:
    """Calculate the option strike price where option sellers lose the least amount of money."""
    min_loss = float("inf")
    max_pain_strike = strikes[len(strikes) // 2] if strikes else 0.0

    for test_strike in strikes:
        total_loss = 0.0
        # Call buyers make money if test_strike > call strike
        for s, oi in zip(strikes, call_ois):
            if test_strike > s:
                total_loss += (test_strike - s) * oi
        # Put buyers make money if test_strike < put strike
        for s, oi in zip(strikes, put_ois):
            if test_strike < s:
                total_loss += (s - test_strike) * oi

        if total_loss < min_loss:
            min_loss = total_loss
            max_pain_strike = test_strike

    return max_pain_strike
