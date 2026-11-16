"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  Code2,
  FileJson,
  FileCode,
} from "lucide-react";
import { StrategyConfig } from "@/types/strategy";
import { generatePythonCode } from "@/lib/strategy-code-generator";

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyConfig;
}

export function CodeExportModal({
  isOpen,
  onClose,
  strategy,
}: CodeExportModalProps) {
  const [tab, setTab] = useState<"python" | "json">("python");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonCode = generatePythonCode(strategy);
  const jsonCode = JSON.stringify(strategy, null, 2);
  const currentContent = tab === "python" ? pythonCode : jsonCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `${strategy.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.${
      tab === "python" ? "py" : "json"
    }`;
    const blob = new Blob([currentContent], {
      type: tab === "python" ? "text/x-python" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0b0e14] border border-[#1e2a3c] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2230]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export Strategy Code</h3>
              <p className="text-xs text-[#94a3b8]">Download or copy Python code and JSON schema for your strategy.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex bg-[#131b2a] border border-[#222e42] rounded-lg p-0.5">
              <button
                onClick={() => setTab("python")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  tab === "python"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-[#64748b] hover:text-white"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Python Script</span>
              </button>
              <button
                onClick={() => setTab("json")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  tab === "json"
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-[#64748b] hover:text-white"
                }`}
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON Schema</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#161f30] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#080a0f]">
          <pre className="text-xs font-mono text-[#cbd5e1] leading-relaxed select-text p-4 rounded-xl bg-[#0d121c] border border-[#1a2436] overflow-x-auto">
            {currentContent}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1a2230] bg-[#0b0e14]">
          <div className="text-xs text-[#64748b]">
            Compatible with Orion Algo Python backend engine & standard quant libraries.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#131b2a] hover:bg-[#1a2538] border border-[#222e42] text-xs font-medium text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
