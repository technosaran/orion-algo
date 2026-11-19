"use client";

import React, { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  AreaSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";
import { EquityPoint } from "@/lib/backtest/types";
import { RotateCcw } from "lucide-react";

interface TradingViewEquityChartProps {
  equityCurve: EquityPoint[];
  initialCapital: number;
  activeTab: "equity" | "drawdown";
  onHoverData?: (data: { timestamp: string; equity: number; benchmark: number; drawdownPct: number } | null) => void;
}

export function TradingViewEquityChart({
  equityCurve,
  initialCapital,
  activeTab,
  onHoverData,
}: TradingViewEquityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const equitySeriesRef = useRef<ISeriesApi<any> | null>(null);
  const benchmarkSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const drawdownSeriesRef = useRef<ISeriesApi<any> | null>(null);

  // Parse points ensuring ascending timestamps
  const processedPoints = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) return [];
    const result: {
      time: UTCTimestamp;
      rawTimestamp: string;
      equity: number;
      benchmark: number;
      drawdownPct: number;
    }[] = [];

    let lastSec = -Infinity;
    equityCurve.forEach((pt, idx) => {
      let parsed = Date.parse(pt.timestamp);
      let sec = !isNaN(parsed) && parsed > 0 ? Math.floor(parsed / 1000) : 1704067200 + idx * 86400;
      if (sec <= lastSec) {
        sec = lastSec + 1;
      }
      lastSec = sec;

      result.push({
        time: (sec as unknown) as UTCTimestamp,
        rawTimestamp: pt.timestamp,
        equity: pt.equity,
        benchmark: pt.benchmark,
        drawdownPct: pt.drawdownPct,
      });
    });

    return result;
  }, [equityCurve]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: "#12141a" },
        textColor: "#9b9b9b",
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(35, 39, 51, 0.6)" },
        horzLines: { color: "rgba(35, 39, 51, 0.6)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#444b58",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#202430",
        },
        horzLine: {
          color: "#444b58",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#202430",
        },
      },
      timeScale: {
        borderColor: "#232733",
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: "en-IN",
        priceFormatter: (price: number) => {
          return (
            "₹" +
            price.toLocaleString("en-IN", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          );
        },
      },
      rightPriceScale: {
        borderColor: "#232733",
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

    if (activeTab === "equity") {
      // Equity Area Series (Zerodha Kite Green)
      const eqSeries = chart.addSeries(AreaSeries, {
        topColor: "rgba(76, 175, 80, 0.35)",
        bottomColor: "rgba(76, 175, 80, 0.0)",
        lineColor: "#4caf50",
        lineWidth: 2,
        title: "Strategy Equity",
      });
      equitySeriesRef.current = eqSeries;

      // Benchmark Line Series (Zerodha Kite Blue)
      const bmSeries = chart.addSeries(LineSeries, {
        color: "#4184f3",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: "Benchmark",
      });
      benchmarkSeriesRef.current = bmSeries;

      const eqData = processedPoints.map((p) => ({ time: p.time, value: p.equity }));
      const bmData = processedPoints.map((p) => ({ time: p.time, value: p.benchmark }));
      eqSeries.setData(eqData);
      bmSeries.setData(bmData);
    } else {
      // Drawdown Area Series (Zerodha Kite Red)
      const ddSeries = chart.addSeries(AreaSeries, {
        topColor: "rgba(223, 81, 76, 0.0)",
        bottomColor: "rgba(223, 81, 76, 0.35)",
        lineColor: "#df514c",
        lineWidth: 2,
        title: "Drawdown %",
        invertFilledArea: true,
      });
      drawdownSeriesRef.current = ddSeries;

      const ddData = processedPoints.map((p) => ({ time: p.time, value: -Math.abs(p.drawdownPct) }));
      ddSeries.setData(ddData);
    }

    // Crosshair listener
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !onHoverData) {
        onHoverData?.(null);
        return;
      }

      const match = processedPoints.find((p) => (p.time as number) === (param.time as number));
      if (match) {
        onHoverData({
          timestamp: match.rawTimestamp,
          equity: match.equity,
          benchmark: match.benchmark,
          drawdownPct: match.drawdownPct,
        });
      } else {
        onHoverData(null);
      }
    });

    chart.timeScale().fitContent();

    // Auto-resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({
        width: Math.max(width, 250),
        height: Math.max(height || 300, 200),
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
  }, [processedPoints, activeTab, onHoverData]);

  const handleFit = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  return (
    <div className="relative w-full h-[320px] bg-[#12141a] rounded-lg overflow-hidden border border-[#232733] font-sans">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
        <button
          onClick={handleFit}
          className="p-1 rounded bg-[#14171f]/90 text-[#9b9b9b] hover:text-white border border-[#232733] text-xs transition-colors"
          title="Fit View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="absolute bottom-1.5 left-2.5 z-10 text-[10px] font-mono tabular-nums text-[#666666] pointer-events-none">
        TradingView Lightweight Charts™
      </div>
    </div>
  );
}
