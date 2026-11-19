"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { ChartTimeframe, CandleData } from "@/types/paperTrading";

interface CsvDatasetUploaderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CsvDatasetUploaderModal({
  onClose,
  onSuccess,
}: CsvDatasetUploaderModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [symbol, setSymbol] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("15m");
  const [category, setCategory] = useState<"stock" | "index" | "crypto" | "commodity">("stock");

  const [parsedCandles, setParsedCandles] = useState<CandleData[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsvText = (text: string) => {
    setParseError(null);
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setParseError("CSV file is empty or missing headers.");
      return;
    }

    // Parse header row
    const headers = lines[0]
      .split(",")
      .map((h) => h.replace(/["']/g, "").trim().toLowerCase());

    const dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("time"));
    const openIdx = headers.findIndex((h) => h.includes("open"));
    const highIdx = headers.findIndex((h) => h.includes("high"));
    const lowIdx = headers.findIndex((h) => h.includes("low"));
    const closeIdx = headers.findIndex((h) => h.includes("close") || h === "price");
    const volIdx = headers.findIndex((h) => h.includes("vol"));

    if (dateIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
      setParseError(
        "Could not auto-detect OHLC columns. Required headers: Date/Time, Open, High, Low, Close."
      );
      return;
    }

    const candles: CandleData[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.replace(/["']/g, "").trim());
      if (parts.length <= Math.max(openIdx, highIdx, lowIdx, closeIdx)) continue;

      const timeStr = parts[dateIdx];
      const open = parseFloat(parts[openIdx]);
      const high = parseFloat(parts[highIdx]);
      const low = parseFloat(parts[lowIdx]);
      const close = parseFloat(parts[closeIdx]);
      const volume = volIdx !== -1 ? parseFloat(parts[volIdx]) || 0 : 0;

      if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
        // Attempt to parse timestamp
        let timestamp = Date.parse(timeStr);
        if (isNaN(timestamp)) {
          // If numeric timestamp
          const num = Number(timeStr);
          timestamp = !isNaN(num) && num > 0 ? (num < 10000000000 ? num * 1000 : num) : Date.now();
        }

        candles.push({
          time: timeStr,
          timestamp,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: Number(volume.toFixed(2)),
        });
      }
    }

    if (candles.length === 0) {
      setParseError("No valid numeric candle rows could be parsed.");
      return;
    }

    setParsedCandles(candles);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!symbol) {
      const base = f.name.replace(/\.[^/.]+$/, "").toUpperCase();
      setSymbol(base.slice(0, 12));
      setDatasetName(`${base} Custom Dataset`);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) parseCsvText(content);
    };
    reader.readAsText(f);
  };

  const handleSaveDataset = async () => {
    if (!symbol.trim() || parsedCandles.length === 0) return;
    setIsUploading(true);

    try {
      const payload = {
        symbol: symbol.trim().toUpperCase(),
        name: datasetName.trim() || `${symbol.toUpperCase()} (${timeframe})`,
        category,
        source: "custom_csv",
        timeframe,
        range: `${parsedCandles.length}b`,
        candles: parsedCandles,
      };

      const res = await fetch("/api/market-data/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setParseError(err.message || "Failed to persist custom dataset to storage.");
      }
    } catch (e: any) {
      setParseError(e.message || "Network error while saving dataset.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#0b0f19] border border-[#1e2a3c] rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2230] bg-[#0d1322]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Import Custom CSV Dataset
              </h3>
              <p className="text-xs text-[#94a3b8]">
                Upload historical OHLCV data for model training and custom backtesting.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#162032] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#1f293d] hover:border-cyan-500/50 rounded-xl p-6 text-center cursor-pointer bg-[#0e1422] transition-colors space-y-2"
          >
            <FileSpreadsheet className="w-8 h-8 text-cyan-400 mx-auto" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div>
                <p className="font-semibold text-white">{file.name}</p>
                <p className="text-[11px] text-[#64748b]">
                  {(file.size / 1024).toFixed(1)} KB • Click to choose a different file
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-white">Click to select or drag & drop CSV file</p>
                <p className="text-[11px] text-[#64748b]">
                  Supported formats: Standard OHLCV (Date, Open, High, Low, Close, Volume)
                </p>
              </div>
            )}
          </div>

          {/* Validation Feedback */}
          {parseError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedCandles.length > 0 && !parseError && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Successfully parsed <strong>{parsedCandles.length.toLocaleString()}</strong> candle bars
                ({parsedCandles[0].time} to {parsedCandles[parsedCandles.length - 1].time})
              </span>
            </div>
          )}

          {/* Metadata Form */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1">
                Asset Symbol (e.g. ZOMATO)
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="RELIANCE / BTC/USDT"
                className="w-full px-3 py-1.5 bg-[#121824] border border-[#1e293b] rounded-lg text-white font-mono placeholder-[#64748b] focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1">
                Dataset Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Custom Test Data"
                className="w-full px-3 py-1.5 bg-[#121824] border border-[#1e293b] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1">
                Candle Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as ChartTimeframe)}
                className="w-full px-3 py-1.5 bg-[#121824] border border-[#1e293b] rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="1m">1m (1 Minute)</option>
                <option value="5m">5m (5 Minutes)</option>
                <option value="15m">15m (15 Minutes)</option>
                <option value="1h">1h (1 Hour)</option>
                <option value="1D">1D (Daily)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] mb-1">
                Asset Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#121824] border border-[#1e293b] rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="stock">Indian Equities (NSE)</option>
                <option value="index">Indian Indices</option>
                <option value="commodity">Commodities</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#1a2230] bg-[#0d1322]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#94a3b8] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveDataset}
            disabled={isUploading || parsedCandles.length === 0 || !symbol.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all disabled:opacity-40 shadow-sm"
          >
            {isUploading ? "Storing Dataset..." : "Save to Stored Datasets"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
