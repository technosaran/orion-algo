"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  BarSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  createSeriesMarkers,
  SeriesMarker,
} from "lightweight-charts";
import {
  CandleData,
  ChartTimeframe,
  ChartType,
  AssetQuote,
  PaperPosition,
  PaperOrder,
} from "@/types/paperTrading";
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
} from "@/lib/paperTradingData";
import {
  BarChart2,
  Activity,
  Maximize2,
  TrendingUp,
  Sliders,
  RotateCcw,
  Layers,
} from "lucide-react";

export type ExtendedChartType = "candlestick" | "area" | "bar" | "line";

interface TradingViewOpenSourceChartProps {
  asset: AssetQuote;
  candles: CandleData[];
  timeframe: ChartTimeframe;
  onChangeTimeframe: (tf: ChartTimeframe) => void;
  position?: PaperPosition | null;
  orders?: PaperOrder[];
}

export function TradingViewOpenSourceChart({
  asset,
  candles,
  timeframe,
  onChangeTimeframe,
  position,
  orders = [],
}: TradingViewOpenSourceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const markersPluginRef = useRef<any>(null);

  // Price lines refs
  const livePriceLineRef = useRef<IPriceLine | null>(null);
  const entryPriceLineRef = useRef<IPriceLine | null>(null);
  const tpPriceLineRef = useRef<IPriceLine | null>(null);
  const slPriceLineRef = useRef<IPriceLine | null>(null);

  // Chart view states
  const [chartType, setChartType] = useState<ExtendedChartType>("candlestick");
  const [showSMA, setShowSMA] = useState<boolean>(true);
  const [showEMA, setShowEMA] = useState<boolean>(true);
  const [showBB, setShowBB] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  // Hover inspection state
  const [hoveredData, setHoveredData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    change?: number;
    changePercent?: number;
  } | null>(null);

  // Sanitize candles to strictly ensure ascending UTCTimestamps
  const sanitizedCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    const result: CandleData[] = [];
    let lastSec = -Infinity;

    for (const c of sorted) {
      let sec = Math.floor(c.timestamp / 1000);
      if (sec <= lastSec) {
        sec = lastSec + 1;
      }
      lastSec = sec;
      result.push({
        ...c,
        timestamp: sec * 1000,
      });
    }
    return result;
  }, [candles]);

  // Fallback latest candle for the header
  const latestCandle = useMemo(() => {
    if (sanitizedCandles.length === 0) return null;
    return sanitizedCandles[sanitizedCandles.length - 1];
  }, [sanitizedCandles]);

  // 1. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear any previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: "#080b12" },
        textColor: "#94a3b8",
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.45)" },
        horzLines: { color: "rgba(30, 41, 59, 0.45)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#475569",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "#475569",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
        minBarSpacing: 4,
      },
      localization: {
        locale: "en-IN",
        priceFormatter: (price: number) => {
          return (
            "₹" +
            price.toLocaleString("en-IN", {
              minimumFractionDigits: price >= 1000 ? 0 : 2,
              maximumFractionDigits: 2,
            })
          );
        },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        scaleMargins: {
          top: 0.1,
          bottom: 0.22, // Space reserved for volume bars
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create Main Series based on active chartType
    let mainSeries: ISeriesApi<any>;
    if (chartType === "candlestick") {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#f43f5e",
        borderUpColor: "#10b981",
        borderDownColor: "#f43f5e",
        wickUpColor: "#10b981",
        wickDownColor: "#f43f5e",
      });
    } else if (chartType === "area") {
      mainSeries = chart.addSeries(AreaSeries, {
        topColor: "rgba(16, 185, 129, 0.45)",
        bottomColor: "rgba(16, 185, 129, 0.0)",
        lineColor: "#10b981",
        lineWidth: 2,
      });
    } else if (chartType === "bar") {
      mainSeries = chart.addSeries(BarSeries, {
        upColor: "#10b981",
        downColor: "#f43f5e",
        openVisible: true,
        thinBars: false,
      });
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: "#10b981",
        lineWidth: 2,
      });
    }
    mainSeriesRef.current = mainSeries;

    // Create Volume Histogram Series (on overlay scale)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "volume-overlay",
    });
    chart.priceScale("volume-overlay").applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Create Indicator Series
    const smaSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      title: "SMA 20",
      crosshairMarkerVisible: false,
    });
    smaSeriesRef.current = smaSeries;

    const emaSeries = chart.addSeries(LineSeries, {
      color: "#06b6d4",
      lineWidth: 1,
      title: "EMA 50",
      crosshairMarkerVisible: false,
    });
    emaSeriesRef.current = emaSeries;

    const bbUpperSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "BB Upper",
      crosshairMarkerVisible: false,
    });
    bbUpperSeriesRef.current = bbUpperSeries;

    const bbMiddleSeries = chart.addSeries(LineSeries, {
      color: "#8b5cf6",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      title: "BB Mid",
      crosshairMarkerVisible: false,
    });
    bbMiddleSeriesRef.current = bbMiddleSeries;

    const bbLowerSeries = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: "BB Lower",
      crosshairMarkerVisible: false,
    });
    bbLowerSeriesRef.current = bbLowerSeries;

    // Crosshair movement listener
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData || !mainSeriesRef.current) {
        setHoveredData(null);
        return;
      }

      const pointData: any = param.seriesData.get(mainSeriesRef.current);
      if (!pointData) {
        setHoveredData(null);
        return;
      }

      const volData: any = volumeSeriesRef.current
        ? param.seriesData.get(volumeSeriesRef.current)
        : null;

      let dateStr = "";
      if (typeof param.time === "number") {
        const d = new Date(param.time * 1000);
        dateStr =
          timeframe === "1D"
            ? d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
            : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }

      if (chartType === "candlestick" || chartType === "bar") {
        const o = pointData.open ?? pointData.value;
        const c = pointData.close ?? pointData.value;
        const h = pointData.high ?? pointData.value;
        const l = pointData.low ?? pointData.value;
        const chg = c - o;
        const chgPct = o !== 0 ? (chg / o) * 100 : 0;

        setHoveredData({
          time: dateStr,
          open: o,
          high: h,
          low: l,
          close: c,
          volume: volData?.value,
          change: chg,
          changePercent: chgPct,
        });
      } else {
        const val = pointData.value;
        setHoveredData({
          time: dateStr,
          close: val,
          volume: volData?.value,
        });
      }
    });

    // Responsive Auto Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({
        width: Math.max(width, 300),
        height: Math.max(height || 420, 320),
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartType, timeframe]);

  // 2. Feed Data into Series & Markers
  useEffect(() => {
    if (!chartRef.current || !mainSeriesRef.current || sanitizedCandles.length === 0) {
      return;
    }

    const mainSeries = mainSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;

    // Set Main Series Data
    if (chartType === "candlestick" || chartType === "bar") {
      const barData = sanitizedCandles.map((c) => ({
        time: (Math.floor(c.timestamp / 1000) as unknown) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      mainSeries.setData(barData);
    } else {
      const lineData = sanitizedCandles.map((c) => ({
        time: (Math.floor(c.timestamp / 1000) as unknown) as UTCTimestamp,
        value: c.close,
      }));
      mainSeries.setData(lineData);
    }

    // Set Volume Histogram Data
    if (volumeSeries) {
      if (showVolume) {
        const volData = sanitizedCandles.map((c) => ({
          time: (Math.floor(c.timestamp / 1000) as unknown) as UTCTimestamp,
          value: c.volume,
          color:
            c.close >= c.open
              ? "rgba(16, 185, 129, 0.4)"
              : "rgba(244, 63, 94, 0.4)",
        }));
        volumeSeries.setData(volData);
      } else {
        volumeSeries.setData([]);
      }
    }

    // SMA 20 Data
    if (smaSeriesRef.current) {
      if (showSMA) {
        const smaValues = calculateSMA(sanitizedCandles, 20);
        const smaData = smaValues
          .map((v, i) => ({
            time: (Math.floor(sanitizedCandles[i].timestamp / 1000) as unknown) as UTCTimestamp,
            value: v,
          }))
          .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);
        smaSeriesRef.current.setData(smaData);
      } else {
        smaSeriesRef.current.setData([]);
      }
    }

    // EMA 50 Data
    if (emaSeriesRef.current) {
      if (showEMA) {
        const emaValues = calculateEMA(sanitizedCandles, 50);
        const emaData = emaValues
          .map((v, i) => ({
            time: (Math.floor(sanitizedCandles[i].timestamp / 1000) as unknown) as UTCTimestamp,
            value: v,
          }))
          .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);
        emaSeriesRef.current.setData(emaData);
      } else {
        emaSeriesRef.current.setData([]);
      }
    }

    // Bollinger Bands Data
    if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
      if (showBB) {
        const bb = calculateBollingerBands(sanitizedCandles, 20, 2);
        const upperData = bb.upper
          .map((v, i) => ({
            time: (Math.floor(sanitizedCandles[i].timestamp / 1000) as unknown) as UTCTimestamp,
            value: v,
          }))
          .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);

        const midData = bb.middle
          .map((v, i) => ({
            time: (Math.floor(sanitizedCandles[i].timestamp / 1000) as unknown) as UTCTimestamp,
            value: v,
          }))
          .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);

        const lowerData = bb.lower
          .map((v, i) => ({
            time: (Math.floor(sanitizedCandles[i].timestamp / 1000) as unknown) as UTCTimestamp,
            value: v,
          }))
          .filter((d): d is { time: UTCTimestamp; value: number } => d.value !== null);

        bbUpperSeriesRef.current.setData(upperData);
        bbMiddleSeriesRef.current.setData(midData);
        bbLowerSeriesRef.current.setData(lowerData);
      } else {
        bbUpperSeriesRef.current.setData([]);
        bbMiddleSeriesRef.current.setData([]);
        bbLowerSeriesRef.current.setData([]);
      }
    }

    // Trade Markers on the Candlestick series
    try {
      const filledOrders = orders.filter((o) => o.status === "FILLED" && o.executedAt);
      if (filledOrders.length > 0) {
        // Map to available candle timestamps
        const markers: SeriesMarker<UTCTimestamp>[] = filledOrders.map((o) => {
          const orderSec = Math.floor(o.executedAt! / 1000);
          // Find nearest candle timestamp
          let closestCandle = sanitizedCandles[sanitizedCandles.length - 1];
          let minDiff = Infinity;
          for (const c of sanitizedCandles) {
            const sec = Math.floor(c.timestamp / 1000);
            const diff = Math.abs(sec - orderSec);
            if (diff < minDiff) {
              minDiff = diff;
              closestCandle = c;
            }
          }

          const isBuy = o.side === "BUY";
          return {
            time: (Math.floor(closestCandle.timestamp / 1000) as unknown) as UTCTimestamp,
            position: isBuy ? ("belowBar" as const) : ("aboveBar" as const),
            color: isBuy ? "#10b981" : "#f43f5e",
            shape: isBuy ? ("arrowUp" as const) : ("arrowDown" as const),
            text: `${o.side} ₹${o.price.toFixed(2)}`,
          };
        });

        // Ensure markers are sorted by time
        markers.sort((a, b) => (a.time as number) - (b.time as number));

        if (!markersPluginRef.current) {
          markersPluginRef.current = createSeriesMarkers(mainSeries, markers);
        } else {
          markersPluginRef.current.setMarkers(markers);
        }
      } else if (markersPluginRef.current) {
        markersPluginRef.current.setMarkers([]);
      }
    } catch (err) {
      console.warn("Markers warning:", err);
    }
  }, [
    sanitizedCandles,
    chartType,
    showSMA,
    showEMA,
    showBB,
    showVolume,
    orders,
  ]);

  // 3. Dynamic Price Lines (Live, Entry, TP, SL)
  useEffect(() => {
    if (!mainSeriesRef.current) return;
    const series = mainSeriesRef.current;

    // Clean up old price lines
    if (livePriceLineRef.current) {
      try {
        series.removePriceLine(livePriceLineRef.current);
      } catch {}
      livePriceLineRef.current = null;
    }
    if (entryPriceLineRef.current) {
      try {
        series.removePriceLine(entryPriceLineRef.current);
      } catch {}
      entryPriceLineRef.current = null;
    }
    if (tpPriceLineRef.current) {
      try {
        series.removePriceLine(tpPriceLineRef.current);
      } catch {}
      tpPriceLineRef.current = null;
    }
    if (slPriceLineRef.current) {
      try {
        series.removePriceLine(slPriceLineRef.current);
      } catch {}
      slPriceLineRef.current = null;
    }

    // Live Price Line
    livePriceLineRef.current = series.createPriceLine({
      price: asset.price,
      color: asset.change24h >= 0 ? "#10b981" : "#f43f5e",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: "LIVE",
    });

    // Active Position Entry Price Line
    if (position && position.entryPrice > 0) {
      entryPriceLineRef.current = series.createPriceLine({
        price: position.entryPrice,
        color: "#38bdf8",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY (${position.side}) ₹${position.entryPrice.toFixed(2)}`,
      });

      // Take Profit Line
      if (position.takeProfit) {
        tpPriceLineRef.current = series.createPriceLine({
          price: position.takeProfit,
          color: "#10b981",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP ₹${position.takeProfit.toFixed(2)}`,
        });
      }

      // Stop Loss Line
      if (position.stopLoss) {
        slPriceLineRef.current = series.createPriceLine({
          price: position.stopLoss,
          color: "#f43f5e",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL ₹${position.stopLoss.toFixed(2)}`,
        });
      }
    }
  }, [asset.price, asset.change24h, position]);

  // Fit content callback
  const handleFitContent = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, []);

  const displayData = hoveredData || (latestCandle ? {
    time: latestCandle.time,
    open: latestCandle.open,
    high: latestCandle.high,
    low: latestCandle.low,
    close: latestCandle.close,
    volume: latestCandle.volume,
    change: latestCandle.close - latestCandle.open,
    changePercent: latestCandle.open !== 0 ? ((latestCandle.close - latestCandle.open) / latestCandle.open) * 100 : 0,
  } : null);

  return (
    <div className="flex flex-col bg-[#0b0f19] border border-[#1a2333] rounded-xl overflow-hidden shadow-2xl">
      {/* Top Bar: Asset Symbol, OHLC Data & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-[#1a2333] bg-[#0c111d]">
        {/* Left: Symbol & Live OHLC Readout */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-white tracking-wide">
              {asset.symbol}
            </span>
            <span className="text-xs text-[#94a3b8] hidden sm:inline">
              {asset.name}
            </span>
            {asset.lotSize && asset.lotSize > 1 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Lot: <strong>{asset.lotSize}</strong> • Tick: <strong>₹{(asset.tickSize || 0.05).toFixed(2)}</strong>
              </span>
            )}
            {asset.indexWeight && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold hidden md:inline">
                {asset.indexWeight}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {asset.category === "crypto" ? "Binance Live Feed" : "Market Feed (Delayed ~15m)"}
            </span>
          </div>

          {/* OHLCV Inspection Bar */}
          {displayData && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748b] font-mono">
              {displayData.open !== undefined && (
                <span>
                  O: <strong className="text-white">₹{displayData.open.toFixed(2)}</strong>
                </span>
              )}
              {displayData.high !== undefined && (
                <span>
                  H: <strong className="text-emerald-400">₹{displayData.high.toFixed(2)}</strong>
                </span>
              )}
              {displayData.low !== undefined && (
                <span>
                  L: <strong className="text-rose-400">₹{displayData.low.toFixed(2)}</strong>
                </span>
              )}
              {displayData.close !== undefined && (
                <span>
                  C: <strong className="text-white">₹{displayData.close.toFixed(2)}</strong>
                </span>
              )}
              {displayData.changePercent !== undefined && (
                <span className={displayData.changePercent >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                  {displayData.changePercent >= 0 ? "+" : ""}
                  {displayData.changePercent.toFixed(2)}%
                </span>
              )}
              {displayData.volume !== undefined && (
                <span className="hidden md:inline">
                  Vol: <strong className="text-[#94a3b8]">{displayData.volume.toLocaleString()}</strong>
                </span>
              )}
              {displayData.time && (
                <span className="text-[#475569] hidden lg:inline">
                  [{displayData.time}]
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Interactive Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-[#121824] p-0.5 rounded-lg border border-[#1e293b]">
            {(["1m", "5m", "15m", "1h", "1D"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  timeframe === tf
                    ? "bg-[#1f2b42] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#cbd5e1]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-[#121824] p-0.5 rounded-lg border border-[#1e293b]">
            <button
              onClick={() => setChartType("candlestick")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                chartType === "candlestick"
                  ? "bg-[#1f2b42] text-emerald-400"
                  : "text-[#64748b] hover:text-white"
              }`}
              title="Candlestick (TradingView)"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("area")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                chartType === "area"
                  ? "bg-[#1f2b42] text-cyan-400"
                  : "text-[#64748b] hover:text-white"
              }`}
              title="Area Mountain Chart"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                chartType === "bar"
                  ? "bg-[#1f2b42] text-purple-400"
                  : "text-[#64748b] hover:text-white"
              }`}
              title="OHLC Bars"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Indicator Toggles */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                showSMA
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold"
                  : "bg-[#121824] text-[#64748b] border-[#1e293b] hover:text-[#94a3b8]"
              }`}
              title="Toggle Simple Moving Average (20)"
            >
              SMA 20
            </button>
            <button
              onClick={() => setShowEMA(!showEMA)}
              className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                showEMA
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-bold"
                  : "bg-[#121824] text-[#64748b] border-[#1e293b] hover:text-[#94a3b8]"
              }`}
              title="Toggle Exponential Moving Average (50)"
            >
              EMA 50
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                showBB
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold"
                  : "bg-[#121824] text-[#64748b] border-[#1e293b] hover:text-[#94a3b8]"
              }`}
              title="Toggle Bollinger Bands (20, 2)"
            >
              BBands
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                showVolume
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold"
                  : "bg-[#121824] text-[#64748b] border-[#1e293b] hover:text-[#94a3b8]"
              }`}
              title="Toggle Volume Bars"
            >
              VOL
            </button>
          </div>

          {/* Reset Zoom / Fit Content */}
          <button
            onClick={handleFitContent}
            className="p-1.5 rounded-md bg-[#121824] text-[#64748b] border border-[#1e293b] hover:text-white hover:border-[#334155] transition-colors"
            title="Fit Chart to Content (Reset Zoom)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main TradingView Canvas Viewport */}
      <div className="relative w-full h-[420px] bg-[#080b12]">
        <div ref={chartContainerRef} className="w-full h-full" />

        {/* Floating Position Badge (if user has active position) */}
        {position && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0f172a]/90 backdrop-blur border border-[#1e293b] text-xs font-mono shadow-lg">
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                position.side === "LONG"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              }`}
            >
              {position.side} {position.quantity}
            </span>
            <span className="text-[#94a3b8]">Entry:</span>
            <span className="text-white font-bold">₹{position.entryPrice.toFixed(2)}</span>
            <span className="text-[#64748b]">|</span>
            <span
              className={`font-bold ${
                position.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {position.unrealizedPnl >= 0 ? "+" : ""}
              ₹{position.unrealizedPnl.toFixed(2)} ({position.unrealizedPnlPercent.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Chart Footer: Indicators Legend & TradingView Open Source Attribution */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-[#0a0e1a] border-t border-[#1a2333] text-[11px] text-[#64748b]">
        {/* Indicators Active Legend */}
        <div className="flex items-center gap-4">
          {showSMA && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" />
              <span>SMA (20)</span>
            </div>
          )}
          {showEMA && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
              <span>EMA (50)</span>
            </div>
          )}
          {showBB && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-purple-400 rounded-full" />
              <span>BBands (20, 2)</span>
            </div>
          )}
          {showVolume && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400/60 rounded-full" />
              <span>Volume</span>
            </div>
          )}
        </div>

        {/* Official TradingView Open Source Badge */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/tradingview/lightweight-charts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#131b2c] hover:bg-[#1a253d] border border-[#1e2a42] text-[#94a3b8] hover:text-white transition-colors text-[10px] font-mono group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:bg-blue-400" />
            <span>TradingView Lightweight Charts™</span>
            <span className="text-[#64748b]">(Open-Source)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
