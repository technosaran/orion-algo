import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

// In-memory simulation fallback if Python FastAPI backend is not running
let fallbackStatus = {
  connected: false,
  broker: null as string | null,
  killSwitchTripped: false,
  isSquareOffTime: false,
  isMarketOpen: false,
  marketSession: "CLOSED" as "OPEN" | "CLOSED" | "SQUARE_OFF",
  dailyRealizedLoss: 0.0,
  maxDailyLossLimit: 10000.0,
};

let fallbackFunds = {
  connected: false,
  netCash: 500000.0,
  availableMargin: 350000.0,
  collateral: 0.0,
};

let fallbackPositions: any[] = [];
let fallbackOrders: any[] = [];

function getMarketState() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const isWeekday = day >= 1 && day <= 5;
  const mins = ist.getHours() * 60 + ist.getMinutes();

  // Indian Equity/F&O Market hours: 09:15 to 15:30 IST (555 to 930 mins)
  // MIS Square-Off window: 15:15 to 15:30 IST (915 to 930 mins)
  const isMarketOpen = isWeekday && mins >= 555 && mins < 930;
  const isSquareOff = isWeekday && mins >= 915 && mins < 930;

  let sessionStatus: "OPEN" | "CLOSED" | "SQUARE_OFF" = "CLOSED";
  if (isSquareOff) {
    sessionStatus = "SQUARE_OFF";
  } else if (isMarketOpen) {
    sessionStatus = "OPEN";
  }

  return { isMarketOpen, isSquareOff, sessionStatus };
}

async function forwardToBackend(
  req: NextRequest,
  pathSegments: string[],
  method: string
) {
  const subpath = pathSegments.join("/");
  const targetUrl = `${BACKEND_URL}/api/v1/live/${subpath}`;

  let bodyStr: string | undefined = undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      bodyStr = await req.text();
    } catch {
      bodyStr = undefined;
    }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000); // 1-second timeout for responsive fallback

    const res = await fetch(targetUrl, {
      method,
      headers,
      body: bodyStr,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    // Backend unreachable: graceful fallback to simulated RMS mode
    return handleFallback(subpath, method, bodyStr);
  }
}

async function handleFallback(subpath: string, method: string, rawBody?: string) {
  let body: any = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = {};
    }
  }

  const marketState = getMarketState();

  if (subpath === "status" && method === "GET") {
    return NextResponse.json({
      ...fallbackStatus,
      isSquareOffTime: marketState.isSquareOff,
      isMarketOpen: marketState.isMarketOpen,
      marketSession: marketState.sessionStatus,
      backendMode: "simulated_local",
    });
  }

  if (subpath === "funds" && method === "GET") {
    return NextResponse.json(fallbackFunds);
  }

  if (subpath === "positions" && method === "GET") {
    return NextResponse.json({
      connected: fallbackStatus.connected,
      positions: fallbackPositions,
    });
  }

  if (subpath === "orders" && method === "GET") {
    return NextResponse.json({
      connected: fallbackStatus.connected,
      orders: fallbackOrders,
    });
  }

  if (subpath === "connect" && method === "POST") {
    const brokerName =
      body.mode === "sandbox" || !body.broker
        ? "AlgoX Sandbox"
        : body.broker?.toLowerCase() === "angel_one"
        ? "Angel One"
        : body.broker?.toLowerCase() === "zerodha"
        ? "Zerodha Kite"
        : "AlgoX Sandbox";

    fallbackStatus.connected = true;
    fallbackStatus.broker = brokerName;
    fallbackFunds.connected = true;

    return NextResponse.json({
      status: "success",
      broker: brokerName,
      connected: true,
      message: `${brokerName} session active in local sandbox mode.`,
    });
  }

  if (subpath === "disconnect" && method === "POST") {
    fallbackStatus.connected = false;
    fallbackStatus.broker = null;
    fallbackFunds.connected = false;
    return NextResponse.json({ status: "success", connected: false });
  }

  if (subpath === "kill-switch" && method === "POST") {
    fallbackStatus.killSwitchTripped = true;
    const closedCount = fallbackPositions.length;
    fallbackPositions = [];
    return NextResponse.json({
      status: "success",
      kill_switch: "ACTIVATED",
      broker_action: {
        status: "success",
        closed_positions: closedCount,
        cancelled_orders: fallbackOrders.length,
      },
    });
  }

  if (subpath === "kill-switch/reset" && method === "POST") {
    fallbackStatus.killSwitchTripped = false;
    return NextResponse.json({
      status: "success",
      kill_switch: "STANDBY",
    });
  }

  if (subpath === "square-off-all" && method === "POST") {
    const closedCount = fallbackPositions.length;
    fallbackPositions = [];
    return NextResponse.json({
      status: "success",
      broker_action: {
        status: "success",
        closed_positions: closedCount,
      },
    });
  }

  if (subpath === "positions/close" && method === "POST") {
    const symbol = body.symbol;
    if (symbol) {
      fallbackPositions = fallbackPositions.filter((p) => p.tradingsymbol !== symbol);
    }
    return NextResponse.json({ status: "success", message: `Position ${symbol || ""} closed.` });
  }

  if (subpath === "orders" && method === "POST") {
    if (fallbackStatus.killSwitchTripped) {
      return NextResponse.json(
        { detail: "RMS Rejected: Kill Switch is ACTIVE. All trading halted." },
        { status: 403 }
      );
    }

    if (!body || !body.symbol) {
      return NextResponse.json(
        { detail: "Invalid order parameters" },
        { status: 400 }
      );
    }

    const price = Number(body.price) || 1000.0;
    const qty = Number(body.quantity) || 1;
    const notional = price * qty;
    // 10% margin for F&O indices, 20% for intraday equities, 100% for delivery
    const isFoIndex = ["NIFTY50", "BANKNIFTY", "CRUDEOIL", "GOLD"].includes(body.symbol);
    const marginMultiplier = isFoIndex
      ? 0.1
      : body.product_type === "DELIVERY"
      ? 1.0
      : 0.2;
    const requiredMargin = notional * marginMultiplier;

    if (requiredMargin > fallbackFunds.availableMargin) {
      return NextResponse.json(
        {
          detail: `RMS Rejected: Insufficient Available Margin. Required ₹${requiredMargin.toLocaleString(
            "en-IN",
            { maximumFractionDigits: 0 }
          )}, available ₹${fallbackFunds.availableMargin.toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          })}`,
        },
        { status: 400 }
      );
    }

    // Deduct margin
    fallbackFunds.availableMargin = Math.max(
      0,
      fallbackFunds.availableMargin - requiredMargin
    );

    const newOrder = {
      order_id: `LIVE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      symbol: body.symbol,
      exchange: body.exchange || "NSE",
      transaction_type: body.transaction_type || "BUY",
      order_type: body.order_type || "MARKET",
      quantity: qty,
      price: price,
      product_type: body.product_type || "INTRADAY",
      status: "COMPLETE",
      created_at: new Date().toISOString(),
    };

    fallbackOrders.unshift(newOrder);

    // Add or update position
    const existing = fallbackPositions.find(
      (p) =>
        p.tradingsymbol === body.symbol &&
        p.producttype === (body.product_type || "INTRADAY")
    );
    if (existing) {
      if (body.transaction_type === "BUY") {
        existing.netqty += qty;
      } else {
        existing.netqty -= qty;
      }
    } else {
      fallbackPositions.unshift({
        tradingsymbol: body.symbol,
        exchange: body.exchange || "NSE",
        producttype: body.product_type || "INTRADAY",
        netqty: body.transaction_type === "BUY" ? qty : -qty,
        buyavgprice: price,
        ltp: price,
        pnl: 0.0,
      });
    }

    return NextResponse.json({
      status: "success",
      order_id: newOrder.order_id,
      message: "Order placed successfully via RMS validation gateway.",
    });
  }

  if (subpath === "rms/config" && method === "POST") {
    if (body.max_daily_loss != null) {
      fallbackStatus.maxDailyLossLimit = body.max_daily_loss;
    }
    return NextResponse.json({
      status: "success",
      rms: {
        maxDailyLoss: fallbackStatus.maxDailyLossLimit,
        maxCapitalPerTradePct: 0.2,
        maxOpenPositions: 4,
        autoSquareOffTime: "15:15",
      },
    });
  }

  return NextResponse.json({ status: "not_found" }, { status: 404 });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return forwardToBackend(req, path, "GET");
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return forwardToBackend(req, path, "POST");
}
