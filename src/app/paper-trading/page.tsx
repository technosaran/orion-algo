"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AssetQuote,
  CandleData,
  ChartTimeframe,
  PaperOrder,
  PaperPosition,
  ClosedTrade,
  BotLog,
  OrderSide,
  OrderType,
} from "@/types/paperTrading";
import {
  INITIAL_ASSETS,
  generateCandlesForSymbol,
  calculateRSI,
  calculateEMA,
} from "@/lib/paperTradingData";
import {
  fetchLiveQuotesFromAPI,
  fetchHistoricalCandlesFromAPI,
} from "@/lib/marketDataClient";
import {
  loadPaperStateFromDb,
  savePaperState,
  saveAccountToDb,
  savePositionToDb,
  deletePositionFromDb,
  saveOrderToDb,
  updateOrderStatusInDb,
  saveClosedTradeToDb,
  saveBotLogToDb,
  resetAccountInDb,
  clearHistoryInDb,
  computePortfolioSummary,
  getDefaultState,
  StoredPaperState,
} from "@/lib/paperTradingStorage";
import { PaperTradingHeader } from "@/components/paper-trading/PaperTradingHeader";
import { PortfolioCards } from "@/components/paper-trading/PortfolioCards";
import { NSEMarketStatusBanner } from "@/components/paper-trading/NSEMarketStatusBanner";
import { MarketWatchlist } from "@/components/paper-trading/MarketWatchlist";
import { InteractiveTradingChart } from "@/components/paper-trading/InteractiveTradingChart";
import { OrderExecutionTicket } from "@/components/paper-trading/OrderExecutionTicket";
import { AlgoBotPanel } from "@/components/paper-trading/AlgoBotPanel";
import { PositionsAndOrdersTabs } from "@/components/paper-trading/PositionsAndOrdersTabs";
import { ResetPortfolioModal } from "@/components/paper-trading/ResetPortfolioModal";
import { OrderToast, ToastMessage } from "@/components/paper-trading/OrderToast";

export default function PaperTradingPage() {
  // 1. Assets & Selected Symbol
  const [quotes, setQuotes] = useState<AssetQuote[]>(INITIAL_ASSETS);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("NIFTY50");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1m");
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [priceDeltas, setPriceDeltas] = useState<Record<string, "up" | "down">>({});

  // 2. Paper Trading Portfolio State
  const [state, setState] = useState<StoredPaperState>(() => getDefaultState());
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // 3. UI, Feed, and Modal State
  const [isSimulating, setIsSimulating] = useState(true);
  const [isRealDataConnected, setIsRealDataConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helper
  const addToast = useCallback(
    (type: "success" | "error" | "info", title: string, description: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load from Supabase Cloud Database on Mount
  useEffect(() => {
    let mounted = true;
    loadPaperStateFromDb().then(({ state: loaded, source }) => {
      if (!mounted) return;
      setState(loaded);
      setIsClientLoaded(true);
      setDbConnected(source === "database");
      if (source === "database") {
        console.log("Paper trading portfolio successfully synced with Cloud Database.");
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Cache to localStorage for fast initial render
  useEffect(() => {
    if (isClientLoaded) {
      savePaperState(state);
    }
  }, [state, isClientLoaded]);

  // Selected asset object
  const currentAsset =
    quotes.find((q) => q.symbol === selectedSymbol) ?? quotes[0];

  // Ref to hold live state for asynchronous tick loops
  const stateRef = useRef(state);
  stateRef.current = state;
  const quotesRef = useRef(quotes);
  quotesRef.current = quotes;
  const candlesRef = useRef(candles);
  candlesRef.current = candles;

  // -------------------------------------------------------------
  // REAL MARKET DATA FETCHING (Binance & Yahoo Finance APIs)
  // -------------------------------------------------------------
  const loadRealQuotes = useCallback(async (notify: boolean = false) => {
    try {
      const realQuotes = await fetchLiveQuotesFromAPI();
      if (realQuotes && realQuotes.length > 0) {
        // Compute real price deltas
        const prevMap = new Map(quotesRef.current.map((q) => [q.symbol, q.price]));
        const deltas: Record<string, "up" | "down"> = {};
        realQuotes.forEach((q) => {
          const prev = prevMap.get(q.symbol);
          if (prev !== undefined) {
            if (q.price > prev) deltas[q.symbol] = "up";
            else if (q.price < prev) deltas[q.symbol] = "down";
          }
        });

        if (Object.keys(deltas).length > 0) {
          setPriceDeltas((prev) => ({ ...prev, ...deltas }));
        }

        setQuotes(realQuotes);
        setIsRealDataConnected(true);

        // Update active candle with real latest price
        const curRealPrice =
          realQuotes.find((q) => q.symbol === selectedSymbol)?.price;
        if (curRealPrice) {
          setCandles((prevCandles) => {
            if (prevCandles.length === 0) return prevCandles;
            const lastIndex = prevCandles.length - 1;
            const lastCandle = { ...prevCandles[lastIndex] };
            lastCandle.close = curRealPrice;
            lastCandle.high = Math.max(lastCandle.high, curRealPrice);
            lastCandle.low = Math.min(lastCandle.low, curRealPrice);
            const updated = [...prevCandles];
            updated[lastIndex] = lastCandle;
            return updated;
          });
        }

        // Check Take Profit / Stop Loss with REAL live prices
        const quotePriceMap = new Map(realQuotes.map((q) => [q.symbol, q.price]));
        stateRef.current.positions.forEach((pos) => {
          const livePrice = quotePriceMap.get(pos.symbol);
          if (!livePrice) return;

          if (
            pos.takeProfit &&
            ((pos.side === "LONG" && livePrice >= pos.takeProfit) ||
              (pos.side === "SHORT" && livePrice <= pos.takeProfit))
          ) {
            closePositionInternal(pos.id, "TAKE_PROFIT", livePrice);
            addToast(
              "success",
              `Take Profit Executed: ${pos.symbol}`,
              `Closed ${pos.quantity} units at ₹${livePrice.toFixed(2)} target!`
            );
          } else if (
            pos.stopLoss &&
            ((pos.side === "LONG" && livePrice <= pos.stopLoss) ||
              (pos.side === "SHORT" && livePrice >= pos.stopLoss))
          ) {
            closePositionInternal(pos.id, "STOP_LOSS", livePrice);
            addToast(
              "error",
              `Stop Loss Triggered: ${pos.symbol}`,
              `Liquidated ${pos.quantity} units at ₹${livePrice.toFixed(2)} to protect capital.`
            );
          }
        });

        // Check Pending limit/stop orders with REAL live prices
        stateRef.current.orders.forEach((ord) => {
          if (ord.status !== "PENDING") return;
          const livePrice = quotePriceMap.get(ord.symbol);
          if (!livePrice) return;

          let shouldExecute = false;
          if (ord.type === "LIMIT") {
            if (ord.side === "BUY" && livePrice <= ord.price) shouldExecute = true;
            if (ord.side === "SELL" && livePrice >= ord.price) shouldExecute = true;
          } else if (ord.type === "STOP") {
            if (ord.side === "BUY" && livePrice >= ord.price) shouldExecute = true;
            if (ord.side === "SELL" && livePrice <= ord.price) shouldExecute = true;
          }

          if (shouldExecute) {
            executePendingOrder(ord.id, livePrice);
          }
        });

        if (notify) {
          addToast(
            "success",
            "Real Market Data Synced",
            `Loaded ${realQuotes.length} live asset prices from Binance & Yahoo Finance.`
          );
        }
      }
    } catch (err) {
      console.warn("Could not sync real market quotes:", err);
    }
  }, [selectedSymbol, addToast]);

  const loadRealCandles = useCallback(
    async (symbol: string, tf: ChartTimeframe) => {
      try {
        const realCandles = await fetchHistoricalCandlesFromAPI(symbol, tf, 60);
        if (realCandles && realCandles.length > 0) {
          setCandles(realCandles);
          setIsRealDataConnected(true);
          return;
        }
      } catch (err) {
        console.warn(`Could not sync real candles for ${symbol}:`, err);
      }

      // Clean fallback anchored to current asset price
      const fallbackCandles = generateCandlesForSymbol(
        symbol,
        currentAsset.price,
        tf,
        30
      );
      setCandles(fallbackCandles);
    },
    [currentAsset.price]
  );

  // Initial fetch on mount: pull real quotes & real candles
  useEffect(() => {
    loadRealQuotes(false);
  }, [loadRealQuotes]);

  // When selected symbol or timeframe changes, pull real historical candles
  useEffect(() => {
    loadRealCandles(selectedSymbol, timeframe);
  }, [selectedSymbol, timeframe, loadRealCandles]);

  // Periodic background refresh for real quotes every 5 seconds (100% REAL DATA)
  useEffect(() => {
    if (!isSimulating) return;
    const quoteInterval = setInterval(() => {
      loadRealQuotes(false);
    }, 5000);
    return () => clearInterval(quoteInterval);
  }, [isSimulating, loadRealQuotes]);

  // Manual refresh handler for user button
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadRealQuotes(true),
      loadRealCandles(selectedSymbol, timeframe),
    ]);
    setIsRefreshing(false);
  };

  // -------------------------------------------------------------
  // ALGO BOT ENGINE: Scans technical signals on real data
  // -------------------------------------------------------------
  useEffect(() => {
    if (!state.botActive) return;

    const botInterval = setInterval(() => {
      const activeState = stateRef.current;
      const targetSymbol = selectedSymbol;
      const currentQuotes = quotesRef.current;
      const activeCandles = candlesRef.current;
      const quote = currentQuotes.find((q) => q.symbol === targetSymbol);
      if (!quote || activeCandles.length < 15) return;

      // Evaluate Strategy on real historical candles
      if (activeState.botStrategyId === "rsi_mean_reversion") {
        const rsi = calculateRSI(activeCandles, 14);

        if (rsi < 32 && activeState.cashBalance > quote.price * 2) {
          const allocAmount = activeState.cashBalance * 0.1;
          const qty =
            quote.category === "crypto"
              ? Number((allocAmount / quote.price).toFixed(3))
              : Math.max(Math.floor(allocAmount / quote.price), 1);

          if (qty > 0) {
            handlePlaceOrderInternal({
              symbol: quote.symbol,
              side: "BUY",
              type: "MARKET",
              quantity: qty,
              price: quote.price,
              takeProfit: Number((quote.price * 1.04).toFixed(2)),
              stopLoss: Number((quote.price * 0.97).toFixed(2)),
              isAlgoTrade: true,
              note: `RSI Oversold trigger (${rsi})`,
            });

            addBotLog("SIGNAL", `RSI Oversold (${rsi}) on ${quote.symbol} -> Auto-BUY ${qty} units.`);
            addToast("info", "Algo Bot Fired Signal", `Auto-bought ${qty} ${quote.symbol} (RSI: ${rsi})`);
          }
        } else if (rsi > 68) {
          const openLong = activeState.positions.find(
            (p) => p.symbol === quote.symbol && p.side === "LONG"
          );
          if (openLong) {
            closePositionInternal(openLong.id, "ALGO_EXIT", quote.price);
            addBotLog("ORDER", `RSI Overbought (${rsi}) on ${quote.symbol} -> Auto-Closed Position #${openLong.id}.`);
            addToast("success", "Algo Bot Profit Exit", `Closed ${openLong.symbol} at RSI ${rsi}`);
          }
        }
      } else if (activeState.botStrategyId === "ema_crossover") {
        const ema20 = calculateEMA(activeCandles, 20);
        const ema50 = calculateEMA(activeCandles, 50);
        const lastIdx = activeCandles.length - 1;

        const e20 = ema20[lastIdx];
        const e50 = ema50[lastIdx];

        if (e20 !== null && e50 !== null) {
          if (e20 > e50 && activeState.cashBalance > quote.price * 2) {
            const hasPosition = activeState.positions.some((p) => p.symbol === quote.symbol);
            if (!hasPosition) {
              const qty =
                quote.category === "crypto"
                  ? Number(((activeState.cashBalance * 0.08) / quote.price).toFixed(3))
                  : Math.max(Math.floor((activeState.cashBalance * 0.08) / quote.price), 1);

              if (qty > 0) {
                handlePlaceOrderInternal({
                  symbol: quote.symbol,
                  side: "BUY",
                  type: "MARKET",
                  quantity: qty,
                  price: quote.price,
                  takeProfit: Number((quote.price * 1.05).toFixed(2)),
                  stopLoss: Number((quote.price * 0.96).toFixed(2)),
                  isAlgoTrade: true,
                  note: `EMA Golden Cross (EMA20: ${e20} > EMA50: ${e50})`,
                });
                addBotLog("SIGNAL", `Golden Cross on ${quote.symbol} -> Auto-BUY ${qty} units.`);
              }
            }
          }
        }
      }
    }, Math.max(state.botSpeedSec, 2) * 1000);

    return () => clearInterval(botInterval);
  }, [state.botActive, state.botStrategyId, state.botSpeedSec, selectedSymbol, addToast]);

  const addBotLog = (type: "INFO" | "SIGNAL" | "ORDER" | "RISK", message: string) => {
    const newLog: BotLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setState((prev) => ({
      ...prev,
      botLogs: [newLog, ...prev.botLogs].slice(0, 50),
    }));
    // Persist bot log to Supabase
    saveBotLogToDb(newLog);
  };

  // -------------------------------------------------------------
  // ORDER PLACEMENT HANDLERS (Synced with Database)
  // -------------------------------------------------------------
  const handlePlaceOrderInternal = (orderData: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price: number;
    targetPrice?: number;
    takeProfit?: number;
    stopLoss?: number;
    isAlgoTrade?: boolean;
    note?: string;
  }) => {
    const orderCost = orderData.price * orderData.quantity;

    if (orderData.type === "MARKET") {
      const newPosition: PaperPosition = {
        id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        symbol: orderData.symbol,
        side: orderData.side === "BUY" ? "LONG" : "SHORT",
        quantity: orderData.quantity,
        entryPrice: orderData.price,
        currentPrice: orderData.price,
        marginUsed: orderCost,
        entryTime: Date.now(),
        takeProfit: orderData.takeProfit,
        stopLoss: orderData.stopLoss,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
      };

      const newOrder: PaperOrder = {
        id: `ord-filled-${Date.now().toString().slice(-6)}`,
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        price: orderData.price,
        quantity: orderData.quantity,
        totalValue: orderCost,
        status: "FILLED",
        createdAt: Date.now(),
        executedAt: Date.now(),
        takeProfit: orderData.takeProfit,
        stopLoss: orderData.stopLoss,
        isAlgoTrade: orderData.isAlgoTrade,
        note: orderData.note,
      };

      const newCash = state.cashBalance - orderCost;

      setState((prev) => ({
        ...prev,
        cashBalance: newCash,
        positions: [newPosition, ...prev.positions],
        orders: [newOrder, ...prev.orders],
      }));

      // Persist to Cloud Database (Supabase)
      savePositionToDb(newPosition);
      saveOrderToDb(newOrder);
      saveAccountToDb(
        state.initialBalance,
        newCash,
        state.botActive,
        state.botStrategyId,
        state.botSpeedSec
      );

      addToast(
        "success",
        `Paper ${orderData.side} Order Filled (Saved to DB)`,
        `${orderData.quantity} ${orderData.symbol} @ ₹${orderData.price.toFixed(2)} (₹${orderCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })})`
      );
    } else {
      const newOrder: PaperOrder = {
        id: `ord-pend-${Date.now().toString().slice(-6)}`,
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        price: orderData.price,
        targetPrice: orderData.targetPrice,
        quantity: orderData.quantity,
        totalValue: orderCost,
        status: "PENDING",
        createdAt: Date.now(),
        takeProfit: orderData.takeProfit,
        stopLoss: orderData.stopLoss,
      };

      setState((prev) => ({
        ...prev,
        orders: [newOrder, ...prev.orders],
      }));

      // Persist to Cloud Database (Supabase)
      saveOrderToDb(newOrder);

      addToast(
        "info",
        `Pending ${orderData.type} Order Placed (Saved to DB)`,
        `${orderData.side} ${orderData.quantity} ${orderData.symbol} when price reaches ₹${orderData.price.toFixed(2)}`
      );
    }
  };

  const executePendingOrder = (orderId: string, executionPrice: number) => {
    setState((prev) => {
      const ord = prev.orders.find((o) => o.id === orderId);
      if (!ord || ord.status !== "PENDING") return prev;

      const orderCost = executionPrice * ord.quantity;
      if (prev.cashBalance < orderCost && ord.side === "BUY") {
        updateOrderStatusInDb(orderId, "REJECTED");
        return {
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId ? { ...o, status: "REJECTED" as const } : o
          ),
        };
      }

      const newPosition: PaperPosition = {
        id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        symbol: ord.symbol,
        side: ord.side === "BUY" ? "LONG" : "SHORT",
        quantity: ord.quantity,
        entryPrice: executionPrice,
        currentPrice: executionPrice,
        marginUsed: orderCost,
        entryTime: Date.now(),
        takeProfit: ord.takeProfit,
        stopLoss: ord.stopLoss,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
      };

      const updatedOrders = prev.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "FILLED" as const,
              executedAt: Date.now(),
              price: executionPrice,
            }
          : o
      );

      const newCash = prev.cashBalance - orderCost;

      // Sync execution to Supabase Database
      savePositionToDb(newPosition);
      updateOrderStatusInDb(orderId, "FILLED", Date.now(), executionPrice);
      saveAccountToDb(
        prev.initialBalance,
        newCash,
        prev.botActive,
        prev.botStrategyId,
        prev.botSpeedSec
      );

      return {
        ...prev,
        cashBalance: newCash,
        positions: [newPosition, ...prev.positions],
        orders: updatedOrders,
      };
    });

    addToast(
      "success",
      `Pending Order Executed & Synced to DB`,
      `Order #${orderId} filled at ₹${executionPrice.toFixed(2)}`
    );
  };

  // -------------------------------------------------------------
  // POSITION CLOSING HANDLER (Synced with Database)
  // -------------------------------------------------------------
  const closePositionInternal = (
    positionId: string,
    reason: "MANUAL" | "TAKE_PROFIT" | "STOP_LOSS" | "ALGO_EXIT",
    exitPriceOverride?: number
  ) => {
    setState((prev) => {
      const pos = prev.positions.find((p) => p.id === positionId);
      if (!pos) return prev;

      const currentQuote = quotesRef.current.find((q) => q.symbol === pos.symbol);
      const exitPrice = exitPriceOverride ?? currentQuote?.price ?? pos.currentPrice;

      const isLong = pos.side === "LONG";
      const pnl = isLong
        ? (exitPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - exitPrice) * pos.quantity;
      const pnlPercent = (pnl / (pos.entryPrice * pos.quantity)) * 100;
      const returnedCash = pos.marginUsed + pnl;

      const closedTrade: ClosedTrade = {
        id: `trd-${Date.now().toString().slice(-6)}`,
        orderId: `ord-exit-${Date.now().toString().slice(-4)}`,
        symbol: pos.symbol,
        side: pos.side,
        quantity: pos.quantity,
        entryPrice: pos.entryPrice,
        exitPrice: Number(exitPrice.toFixed(2)),
        realizedPnl: Number(pnl.toFixed(2)),
        realizedPnlPercent: Number(pnlPercent.toFixed(2)),
        openedAt: pos.entryTime,
        closedAt: Date.now(),
        closeReason: reason,
      };

      const newCash = prev.cashBalance + returnedCash;

      // Persist trade and removal to Supabase
      deletePositionFromDb(positionId);
      saveClosedTradeToDb(closedTrade);
      saveAccountToDb(
        prev.initialBalance,
        newCash,
        prev.botActive,
        prev.botStrategyId,
        prev.botSpeedSec
      );

      return {
        ...prev,
        cashBalance: newCash,
        positions: prev.positions.filter((p) => p.id !== positionId),
        history: [closedTrade, ...prev.history],
      };
    });
  };

  const handleClosePosition = (id: string) => {
    const pos = state.positions.find((p) => p.id === id);
    if (!pos) return;
    closePositionInternal(id, "MANUAL");
    addToast(
      "info",
      `Position Closed & Saved: ${pos.symbol}`,
      `Liquidated ${pos.quantity} units at market price.`
    );
  };

  const handleCloseAllPositions = () => {
    state.positions.forEach((pos) => {
      closePositionInternal(pos.id, "MANUAL");
    });
    addToast("info", "All Positions Liquidated", "Liquidated and saved all active paper positions.");
  };

  const handleCancelOrder = (orderId: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId ? { ...o, status: "CANCELLED" as const } : o
      ),
    }));
    updateOrderStatusInDb(orderId, "CANCELLED");
    addToast("info", "Order Cancelled", `Cancelled order #${orderId}`);
  };

  const handleClearHistory = () => {
    setState((prev) => ({
      ...prev,
      history: [],
    }));
    clearHistoryInDb();
    addToast("info", "History Cleared", "Closed trade log cleared from DB.");
  };

  const handleConfirmReset = (newBalance: number, wipeHistory: boolean) => {
    setState((prev) => ({
      ...prev,
      initialBalance: newBalance,
      cashBalance: newBalance,
      positions: [],
      orders: [],
      history: wipeHistory ? [] : prev.history,
      botLogs: wipeHistory ? [] : prev.botLogs,
      botActive: false,
    }));
    resetAccountInDb(newBalance, wipeHistory);
    addToast(
      "success",
      "Account Reset Complete (Synced to DB)",
      `Virtual paper balance restored to ₹${newBalance.toLocaleString("en-IN")}.`
    );
  };

  // Compute portfolio summary metrics
  const summary = computePortfolioSummary(state, quotes);

  return (
    <div className="flex-1 overflow-y-auto h-full flex flex-col p-4 md:p-6 space-y-5 bg-[#080a0f] text-[#cbd5e1]">
      {/* 1. Header with Simulator & Bot Controls */}
      <PaperTradingHeader
        isSimulating={isSimulating}
        onToggleSimulating={() => setIsSimulating(!isSimulating)}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        botActive={state.botActive}
        onToggleBot={() => {
          const nextBot = !state.botActive;
          setState((prev) => ({ ...prev, botActive: nextBot }));
          saveAccountToDb(
            state.initialBalance,
            state.cashBalance,
            nextBot,
            state.botStrategyId,
            state.botSpeedSec
          );
        }}
        initialBalance={state.initialBalance}
        isRealDataConnected={isRealDataConnected}
        onRefreshRealData={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 2. Top Metric KPI Cards */}
      <PortfolioCards
        summary={summary}
        openPositionsCount={state.positions.length}
      />

      {/* 2.5 NSE Market Status & Regulatory Info Banner */}
      <NSEMarketStatusBanner />

      {/* 3. Main Trading Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Market Watchlist (3 cols on lg) */}
        <div className="lg:col-span-3 h-[460px] lg:h-[520px]">
          <MarketWatchlist
            assets={quotes}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={(sym) => setSelectedSymbol(sym)}
            priceDeltas={priceDeltas}
          />
        </div>

        {/* Center Column: Interactive Chart (6 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col space-y-4">
          <InteractiveTradingChart
            asset={currentAsset}
            candles={candles}
            timeframe={timeframe}
            onChangeTimeframe={(tf) => setTimeframe(tf)}
            position={state.positions.find((p) => p.symbol === currentAsset.symbol)}
            orders={state.orders.filter((o) => o.symbol === currentAsset.symbol)}
          />

          {/* Algorithmic Bot Controller Panel */}
          <AlgoBotPanel
            botActive={state.botActive}
            onToggleBot={() => {
              const nextBot = !state.botActive;
              setState((prev) => ({ ...prev, botActive: nextBot }));
              saveAccountToDb(
                state.initialBalance,
                state.cashBalance,
                nextBot,
                state.botStrategyId,
                state.botSpeedSec
              );
            }}
            strategyId={state.botStrategyId}
            onChangeStrategy={(id) => {
              setState((prev) => ({ ...prev, botStrategyId: id }));
              saveAccountToDb(
                state.initialBalance,
                state.cashBalance,
                state.botActive,
                id,
                state.botSpeedSec
              );
            }}
            speedSec={state.botSpeedSec}
            onChangeSpeed={(sec) => {
              setState((prev) => ({ ...prev, botSpeedSec: sec }));
              saveAccountToDb(
                state.initialBalance,
                state.cashBalance,
                state.botActive,
                state.botStrategyId,
                sec
              );
            }}
            logs={state.botLogs}
            onClearLogs={() => {
              setState((prev) => ({ ...prev, botLogs: [] }));
              clearHistoryInDb();
            }}
            currentAsset={currentAsset}
          />
        </div>

        {/* Right Column: Order Execution Desk (3 cols on lg) */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <OrderExecutionTicket
            asset={currentAsset}
            availableCash={state.cashBalance}
            onPlaceOrder={handlePlaceOrderInternal}
          />
        </div>
      </div>

      {/* 4. Bottom Tabbed Section: Positions, Pending Orders, Trade History */}
      <PositionsAndOrdersTabs
        positions={state.positions}
        orders={state.orders}
        history={state.history}
        quotes={quotes}
        onClosePosition={handleClosePosition}
        onCloseAllPositions={handleCloseAllPositions}
        onCancelOrder={handleCancelOrder}
        onClearHistory={handleClearHistory}
      />

      {/* Reset Account Balance Modal */}
      <ResetPortfolioModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleConfirmReset}
        currentBalance={state.cashBalance}
      />

      {/* Floating Order Notification Toasts */}
      <OrderToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
