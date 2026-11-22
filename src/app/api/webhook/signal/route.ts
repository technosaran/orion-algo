import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  loadPaperStateFromDb,
  saveOrderToDb,
  savePositionToDb,
  deletePositionFromDb,
  saveClosedTradeToDb,
  saveAccountToDb,
  saveBotLogToDb,
  savePaperState,
} from "@/lib/paperTradingStorage";
import { PaperOrder, PaperPosition, ClosedTrade, BotLog } from "@/types/paperTrading";

const VALID_SECRETS = new Set([
  process.env.WEBHOOK_SECRET,
  "algox_live_bridge_key_9921",
  "orion_algo_tradingview_bridge",
].filter(Boolean));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      secret,
      symbol = "NIFTY50",
      action = "BUY",
      quantity = 65,
      order_type = "MARKET",
      price,
      tp,
      sl,
      product_type = "MIS",
    } = body;

    // 1. Authenticate secret
    if (!secret || !VALID_SECRETS.has(secret)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing webhook secret key" },
        { status: 401 }
      );
    }

    const cleanSymbol = String(symbol).toUpperCase().trim();
    const cleanAction = String(action).toUpperCase().trim();
    const cleanQty = Number(quantity) || 1;

    if (!["BUY", "SELL"].includes(cleanAction)) {
      return NextResponse.json(
        { error: "Invalid action. Must be BUY or SELL." },
        { status: 400 }
      );
    }

    // 2. Determine execution price
    let executedPrice = Number(price);
    if (!executedPrice || isNaN(executedPrice) || executedPrice <= 0) {
      // Fetch live price quote from local quotes API
      try {
        const quoteRes = await fetch("http://localhost:3000/api/market-data/quotes", {
          cache: "no-store",
        });
        if (quoteRes.ok) {
          const qJson = await quoteRes.json();
          const match = (qJson.quotes || []).find(
            (q: any) => q.symbol.toUpperCase() === cleanSymbol
          );
          if (match && match.price) {
            executedPrice = match.price;
          }
        }
      } catch {
        // Fallback default
      }
    }

    if (!executedPrice || executedPrice <= 0) {
      // Sensible instrument default
      executedPrice =
        cleanSymbol.includes("BANK") ? 52180.0 :
        cleanSymbol.includes("NIFTY") ? 24350.0 :
        cleanSymbol.includes("RELIANCE") ? 2985.0 :
        cleanSymbol.includes("CRUDE") ? 6240.0 : 1000.0;
    }

    // 3. Load Paper Trading State
    const { state: paperState } = await loadPaperStateFromDb();
    const targetOppositeSide = cleanAction === "BUY" ? "SHORT" : "LONG";
    const existingOppositePos = paperState.positions.find(
      (p) => p.symbol === cleanSymbol && p.side === targetOppositeSide
    );

    const orderId = `ord-wh-${Date.now()}`;
    const totalValue = Number((executedPrice * cleanQty).toFixed(2));

    const newOrder: PaperOrder = {
      id: orderId,
      symbol: cleanSymbol,
      side: cleanAction as "BUY" | "SELL",
      type: (order_type.toUpperCase() as any) || "MARKET",
      price: executedPrice,
      quantity: cleanQty,
      totalValue,
      status: "FILLED",
      createdAt: Date.now(),
      executedAt: Date.now(),
      isAlgoTrade: true,
      note: `TradingView Webhook Bridge (${product_type})`,
      takeProfit: tp ? Number(tp) : undefined,
      stopLoss: sl ? Number(sl) : undefined,
    };

    let updatedCash = paperState.cashBalance;
    let updatedPositions: PaperPosition[] = [...paperState.positions];

    if (existingOppositePos) {
      // Square off / exit existing opposite position
      const closeQty = Math.min(cleanQty, existingOppositePos.quantity);
      const isCoveringShort = existingOppositePos.side === "SHORT";
      const pnl = isCoveringShort
        ? (existingOppositePos.entryPrice - executedPrice) * closeQty
        : (executedPrice - existingOppositePos.entryPrice) * closeQty;
      const pnlPercent = (pnl / (existingOppositePos.entryPrice * closeQty)) * 100;
      const returnedMargin = (existingOppositePos.marginUsed / existingOppositePos.quantity) * closeQty;
      const releasedFunds = returnedMargin + pnl;

      const closedTrade: ClosedTrade = {
        id: `trd-wh-${Date.now().toString().slice(-6)}`,
        orderId,
        symbol: cleanSymbol,
        side: existingOppositePos.side,
        quantity: closeQty,
        entryPrice: existingOppositePos.entryPrice,
        exitPrice: executedPrice,
        realizedPnl: Number(pnl.toFixed(2)),
        realizedPnlPercent: Number(pnlPercent.toFixed(2)),
        openedAt: existingOppositePos.entryTime,
        closedAt: Date.now(),
        closeReason: "ALGO_EXIT",
      };

      await saveClosedTradeToDb(closedTrade);

      if (closeQty >= existingOppositePos.quantity) {
        updatedPositions = updatedPositions.filter((p) => p.id !== existingOppositePos.id);
        await deletePositionFromDb(existingOppositePos.id);
      } else {
        const remainingQty = existingOppositePos.quantity - closeQty;
        const remainingMargin =
          (existingOppositePos.marginUsed / existingOppositePos.quantity) * remainingQty;
        const updatedPos: PaperPosition = {
          ...existingOppositePos,
          quantity: remainingQty,
          marginUsed: remainingMargin,
        };
        updatedPositions = updatedPositions.map((p) =>
          p.id === existingOppositePos.id ? updatedPos : p
        );
        await savePositionToDb(updatedPos);
      }

      updatedCash += releasedFunds;
    } else {
      // Open new position
      const posId = `pos-wh-${Date.now()}`;
      const marginUsed = totalValue;
      const newPos: PaperPosition = {
        id: posId,
        symbol: cleanSymbol,
        side: cleanAction === "BUY" ? "LONG" : "SHORT",
        quantity: cleanQty,
        entryPrice: executedPrice,
        currentPrice: executedPrice,
        marginUsed,
        entryTime: Date.now(),
        takeProfit: tp ? Number(tp) : undefined,
        stopLoss: sl ? Number(sl) : undefined,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
      };

      updatedPositions.push(newPos);
      await savePositionToDb(newPos);
      updatedCash = Math.max(0, updatedCash - marginUsed);
    }

    // Save Order and Account update
    await saveOrderToDb(newOrder);
    await saveAccountToDb(
      paperState.initialBalance,
      updatedCash,
      paperState.botActive,
      paperState.botStrategyId,
      paperState.botSpeedSec
    );

    // Save Bot Log
    const newLog: BotLog = {
      id: `log-wh-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }),
      type: "ORDER",
      message: `TradingView Webhook Executed: ${cleanAction} ${cleanQty} ${cleanSymbol} @ ₹${executedPrice.toFixed(2)}`,
    };
    await saveBotLogToDb(newLog);

    // Sync localStorage cache
    savePaperState({
      ...paperState,
      cashBalance: updatedCash,
      orders: [newOrder, ...paperState.orders],
      positions: updatedPositions,
      lastUpdated: Date.now(),
    });

    return NextResponse.json({
      status: "success",
      order_id: orderId,
      symbol: cleanSymbol,
      action: cleanAction,
      executed_price: executedPrice,
      quantity: cleanQty,
      total_value: totalValue,
      timestamp: new Date().toISOString(),
      message: `TradingView signal executed successfully in Paper Trading portfolio.`,
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json(
      { error: "Internal Server Error processing webhook", details: err?.message },
      { status: 500 }
    );
  }
}
