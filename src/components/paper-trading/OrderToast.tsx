"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description: string;
}

interface OrderToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function OrderToast({ toasts, onDismiss }: OrderToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200 ${
            t.type === "success"
              ? "bg-[#0b1419]/95 border-emerald-500/40 text-emerald-300"
              : t.type === "error"
              ? "bg-[#190b0e]/95 border-rose-500/40 text-rose-300"
              : "bg-[#0b1019]/95 border-cyan-500/40 text-cyan-300"
          }`}
        >
          {t.type === "success" && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {t.type === "error" && (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          {t.type === "info" && (
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white tracking-wide">{t.title}</h4>
            <p className="text-[11px] text-[#cbd5e1] mt-0.5 break-words">{t.description}</p>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-[#64748b] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
