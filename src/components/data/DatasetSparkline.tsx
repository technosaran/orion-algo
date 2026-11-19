"use client";

import React, { useId } from "react";

interface DatasetSparklineProps {
  data: number[];
  width?: number | string;
  height?: number;
  className?: string;
  showGradient?: boolean;
}

export function DatasetSparkline({
  data,
  width = "100%",
  height = 42,
  className = "",
  showGradient = true,
}: DatasetSparklineProps) {
  const gradientId = useId();

  if (!data || data.length < 2) {
    return (
      <div
        style={{ height }}
        className={`w-full flex items-center justify-center opacity-30 ${className}`}
      >
        <div className="w-full h-px border-b border-dashed border-[#64748b]" />
      </div>
    );
  }

  // Downsample to max 50 points if large dataset to keep SVG crisp & lightweight
  const maxPoints = 50;
  let sampled = data;
  if (data.length > maxPoints) {
    const step = (data.length - 1) / (maxPoints - 1);
    sampled = [];
    for (let i = 0; i < maxPoints; i++) {
      sampled.push(data[Math.round(i * step)]);
    }
  }

  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;

  // Viewport dimensions
  const viewWidth = 180;
  const viewHeight = 48;
  const paddingY = 4;
  const effectiveHeight = viewHeight - paddingY * 2;

  const points = sampled.map((val, idx) => {
    const x = (idx / (sampled.length - 1)) * viewWidth;
    const y = viewHeight - paddingY - ((val - min) / range) * effectiveHeight;
    return { x, y };
  });

  const isBullish = sampled[sampled.length - 1] >= sampled[0];
  const strokeColor = isBullish ? "#10b981" : "#f43f5e";
  const fillColor = isBullish ? "#10b981" : "#f43f5e";

  // Create SVG path
  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, "");

  // Area path for gradient under curve
  const areaD = `${pathD} L ${viewWidth},${viewHeight} L 0,${viewHeight} Z`;

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ height }}>
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {showGradient && (
          <path d={areaD} fill={`url(#${gradientId})`} />
        )}

        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pulse dot at last point */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="2.5"
            fill={strokeColor}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
