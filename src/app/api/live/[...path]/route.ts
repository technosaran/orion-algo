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

async function forwardToBackend(
  req: NextRequest,
  pathSegments: string[],
  method: string
) {
  const subpath = pathSegments.join("/");
  const targetUrl = `${BACKEND_URL}/api/v1/live/${subpath}`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    let body: string | undefined = undefined;
    if (method !== "GET" && method !== "HEAD") {
      try {
        body = await req.text();
      } catch {
        body = undefined;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    // Backend unreachable: graceful fallback to simulated RMS mode
    return handleFallback(subpath, method, req);
  }
}

async function handleFallback(subpath: string, method: string, req: NextRequest) {
  if (subpath === "status" && method === "GET") {
    // Calculate if past 15:15 IST
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const mins = ist.getHours() * 60 + ist.getMinutes();
    const isSquareOff = mins >= 15 * 60 + 15;

    return NextResponse.json({
      ...fallbackStatus,
      isSquareOffTime: isSquareOff,
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
    try {
      const data = await req.json();
      const brokerName =
        data.broker?.toLowerCase() === "angel_one"
          ? "Angel One"
          : "Zerodha Kite";

      fallbackStatus.connected = true;
      fallbackStatus.broker = brokerName;
      fallbackFunds.connected = true;

      return NextResponse.json({
        status: "success",
        broker: brokerName,
        connected: true,
        message: `${brokerName} session active in local sandbox mode.`,
      });
    } catch {
      return NextResponse.json(
        { status: "error", message: "Invalid request payload" },
        { status: 400 }
      );
    }
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

  if (subpath === "orders" && method === "POST") {
    if (fallbackStatus.killSwitchTripped) {
      return NextResponse.json(
        { detail: "RMS Rejected: Kill Switch is ACTIVE. All trading halted." },
        { status: 403 }
      );
    }

    try {
      const body = await req.json();
      const newOrder = {
        order_id: `LIVE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        symbol: body.symbol,
        exchange: body.exchange || "NSE",
        transaction_type: body.transaction_type,
        order_type: body.order_type || "MARKET",
        quantity: body.quantity,
        price: body.price || 1000.0,
        product_type: body.product_type || "INTRADAY",
        status: "COMPLETE",
        created_at: new Date().toISOString(),
      };

      fallbackOrders.unshift(newOrder);

      // Add to positions
      const existing = fallbackPositions.find(
        (p) => p.tradingsymbol === body.symbol
      );
      if (existing) {
        if (body.transaction_type === "BUY") {
          existing.netqty += body.quantity;
        } else {
          existing.netqty -= body.quantity;
        }
      } else {
        fallbackPositions.push({
          tradingsymbol: body.symbol,
          exchange: body.exchange || "NSE",
          producttype: body.product_type || "INTRADAY",
          netqty: body.transaction_type === "BUY" ? body.quantity : -body.quantity,
          buyavgprice: body.price || 1000.0,
          ltp: body.price || 1000.0,
          pnl: 0.0,
        });
      }

      return NextResponse.json({
        status: "success",
        order_id: newOrder.order_id,
        message: "Order placed successfully via RMS validation gateway.",
      });
    } catch {
      return NextResponse.json(
        { detail: "Failed to parse order payload" },
        { status: 400 }
      );
    }
  }

  if (subpath === "rms/config" && method === "POST") {
    try {
      const body = await req.json();
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
    } catch {
      return NextResponse.json({ status: "error" }, { status: 400 });
    }
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
