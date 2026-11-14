"use client";

import React, { useState } from "react";
import { RotateCcw, X, AlertTriangle } from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface ResetPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (newBalance: number, wipeHistory: boolean) => void;
  currentBalance: number;
}

export function ResetPortfolioModal({
  isOpen,
  onClose,
  onConfirmReset,
  currentBalance,
}: ResetPortfolioModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(1000000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [wipeHistory, setWipeHistory] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleReset = () => {
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (amount > 0) {
      onConfirmReset(amount, wipeHistory);
      onClose();
    }
  };

  const presetOptions = [
    { amount: 100000, label: "₹1,00,000 (1 Lakh)" },
    { amount: 500000, label: "₹5,00,000 (5 Lakhs)" },
    { amount: 1000000, label: "₹10,00,000 (10 Lakhs)" },
    { amount: 2500000, label: "₹25,00,000 (25 Lakhs)" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#0b0f19] border border-[#1a2333] rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1a2333]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Reset Paper Trading Account</h3>
              <p className="text-[11px] text-[#64748b]">
                Current Virtual Cash: {formatINR(currentBalance)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#64748b] hover:text-white hover:bg-[#121824] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning note */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Resetting your account will liquidate all open positions and restore your starting virtual INR cash.
          </span>
        </div>

        {/* Starting Cash Preset Choices */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-[#94a3b8]">
            Select Starting Virtual Balance (INR):
          </label>
          <div className="grid grid-cols-2 gap-2">
            {presetOptions.map((opt) => (
              <button
                key={opt.amount}
                type="button"
                onClick={() => {
                  setSelectedAmount(opt.amount);
                  setCustomAmount("");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                  selectedAmount === opt.amount && !customAmount
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm"
                    : "bg-[#121824] border-[#1e293b] text-[#94a3b8] hover:text-white hover:bg-[#182338]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <div className="pt-1">
            <span className="block text-[11px] text-[#64748b] mb-1">Or custom amount (₹):</span>
            <input
              type="number"
              placeholder="e.g. 1000000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-[#121824] border border-[#1e293b] rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Wipe history toggle */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="wipeHistory"
            checked={wipeHistory}
            onChange={(e) => setWipeHistory(e.target.checked)}
            className="w-4 h-4 rounded bg-[#121824] border-[#1e293b] text-emerald-500 focus:ring-0 focus:ring-offset-0"
          />
          <label htmlFor="wipeHistory" className="text-xs text-[#cbd5e1] select-none cursor-pointer">
            Wipe closed trade history & algo execution logs
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1a2333]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#94a3b8] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors shadow-md shadow-amber-500/20"
          >
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
}
