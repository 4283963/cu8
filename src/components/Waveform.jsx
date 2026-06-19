import React, { useMemo } from 'react';

export default function Waveform({ peaks, trimStart = 0, trimEnd = 0, duration }) {
  const svgWidth = 800;
  const svgHeight = 80;
  const barWidth = 2;
  const barGap = 1;

  const displayBars = useMemo(() => {
    if (!peaks || peaks.length === 0) return [];
    const maxBars = Math.floor(svgWidth / (barWidth + barGap));
    if (peaks.length <= maxBars) return peaks;
    const step = peaks.length / maxBars;
    const result = [];
    for (let i = 0; i < maxBars; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      let max = 0;
      for (let j = start; j < end && j < peaks.length; j++) {
        if (peaks[j] > max) max = peaks[j];
      }
      result.push(max);
    }
    return result;
  }, [peaks]);

  const trimStartPct = duration > 0 ? (trimStart / 1000) / duration : 0;
  const trimEndPct = duration > 0 ? (trimEnd / 1000) / duration : 0;
  const activeStart = trimStartPct * svgWidth;
  const activeEnd = svgWidth - trimEndPct * svgWidth;

  return (
    <svg
      className="waveform"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="waveGradDim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
      </defs>

      {trimStartPct > 0 && (
        <rect
          x="0" y="0"
          width={activeStart} height={svgHeight}
          fill="rgba(239, 68, 68, 0.15)"
        />
      )}
      {trimEndPct > 0 && (
        <rect
          x={activeEnd} y="0"
          width={svgWidth - activeEnd} height={svgHeight}
          fill="rgba(239, 68, 68, 0.15)"
        />
      )}

      {displayBars.map((peak, i) => {
        const x = i * (barWidth + barGap);
        const barHeight = Math.max(2, peak * (svgHeight - 10));
        const y = (svgHeight - barHeight) / 2;
        const inActiveRange = x >= activeStart && x + barWidth <= activeEnd;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx="1"
            fill={inActiveRange ? 'url(#waveGrad)' : 'url(#waveGradDim)'}
          />
        );
      })}

      <line x1={activeStart} y1="0" x2={activeStart} y2={svgHeight} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />
      <line x1={activeEnd} y1="0" x2={activeEnd} y2={svgHeight} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2" />
    </svg>
  );
}
