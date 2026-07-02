import { useState, useRef } from "react";

// Types for chart data
interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number; // For combo charts
}

interface CommonChartProps {
  title: string;
  data: ChartDataPoint[];
  color?: string;
  secondaryColor?: string;
  height?: number;
}

export function InteractiveLineChart({ title, data, color = "#6366f1", height = 200 }: CommonChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (data.length === 0) return null;

  // Max value for scaling
  const maxValue = Math.max(...data.map((d) => d.value)) || 10;
  const padding = 30;
  const svgWidth = 500;
  const svgHeight = height;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  // Calculate coordinates
  const points = data.map((d, idx) => {
    const x = padding + (idx * graphWidth) / (data.length - 1 || 1);
    const y = padding + graphHeight - (d.value * graphHeight) / maxValue;
    return { x, y, label: d.label, value: d.value };
  });

  // Create path description
  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  // Create area path
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${padding + graphHeight} L ${points[0].x} ${padding + graphHeight} Z`
    : "";

  const handleMouseMove = (e: React.MouseEvent, idx: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 35
    });
    setHoveredIdx(idx);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-slate-150 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 transition-all duration-300"
    >
      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
        {title}
      </h3>
      <div className="relative">
        <svg className="w-full h-48" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id={`line-grad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = padding + (i * graphHeight) / 3;
            return (
              <line
                key={i}
                x1={padding}
                y1={y}
                x2={svgWidth - padding}
                y2={y}
                stroke="currentColor"
                className="text-slate-100 dark:text-white/[0.04]"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area fill */}
          {areaD && <path d={areaD} fill={`url(#line-grad-${title.replace(/\s+/g, "")})`} />}

          {/* Path stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Node Circles */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === idx ? "6.5" : "4.5"}
              fill={color}
              stroke="#ffffff"
              strokeWidth={hoveredIdx === idx ? "3" : "2"}
              className="transition-all duration-150 cursor-pointer"
              onMouseMove={(e) => handleMouseMove(e, idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Custom HTML Tooltip */}
        {hoveredIdx !== null && (
          <div
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
            className="absolute z-10 pointer-events-none rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-md dark:bg-ink-950 dark:border dark:border-white/5 animate-fade-in"
          >
            <span className="block text-[8px] text-slate-400 font-semibold">{points[hoveredIdx].label}</span>
            <span className="block">{points[hoveredIdx].value.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* X Axis Labels */}
      <div className="mt-3 flex justify-between px-6 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {data.map((d, index) => (
          <span key={index}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function InteractiveBarChart({ title, data, color = "#8b5cf6", height = 200 }: CommonChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value)) || 10;
  const padding = 30;
  const svgWidth = 500;
  const svgHeight = height;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  const barWidth = Math.min(30, graphWidth / data.length - 15);
  const spacing = graphWidth / data.length;

  const handleMouseMove = (e: React.MouseEvent, idx: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 35
    });
    setHoveredIdx(idx);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-slate-150 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 transition-all duration-300"
    >
      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
        {title}
      </h3>
      <div className="relative">
        <svg className="w-full h-48" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
          {/* Grid lines */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = padding + (i * graphHeight) / 3;
            return (
              <line
                key={i}
                x1={padding}
                y1={y}
                x2={svgWidth - padding}
                y2={y}
                stroke="currentColor"
                className="text-slate-100 dark:text-white/[0.04]"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Bar Rects */}
          {data.map((d, idx) => {
            const barHeight = (d.value * graphHeight) / maxValue;
            const x = padding + idx * spacing + (spacing - barWidth) / 2;
            const y = padding + graphHeight - barHeight;

            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={color}
                opacity={hoveredIdx === idx ? 1.0 : 0.8}
                className="transition-all duration-150 cursor-pointer"
                onMouseMove={(e) => handleMouseMove(e, idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {hoveredIdx !== null && (
          <div
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
            className="absolute z-10 pointer-events-none rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-md dark:bg-ink-950 dark:border dark:border-white/5 animate-fade-in"
          >
            <span className="block text-[8px] text-slate-400 font-semibold">{data[hoveredIdx].label}</span>
            <span className="block">{data[hoveredIdx].value.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-between px-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {data.map((d, index) => (
          <span key={index} className="truncate max-w-[60px]" title={d.label}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function InteractiveDoughnutChart({ title, data, height = 200 }: CommonChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = 50;
  const strokeWidth = 14;
  const center = 75;
  const circumference = 2 * Math.PI * radius;

  // Predefined gorgeous colors for sectors
  const colors = ["#6366f1", "#06b6d4", "#ec4899", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

  let accumulatedAngle = 0;

  const sectors = data.map((d, idx) => {
    const percentage = d.value / total;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle;
    accumulatedAngle += percentage * circumference;

    return {
      ...d,
      percentage,
      strokeDasharray,
      strokeDashoffset,
      color: colors[idx % colors.length]
    };
  });

  return (
    <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 flex flex-col md:flex-row items-center gap-6 transition-all duration-300">
      <div className="flex-1 w-full">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider text-left">
          {title}
        </h3>

        {/* Legend listing */}
        <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin pr-2 text-left">
          {sectors.map((sec, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors ${
                hoveredIdx === idx ? "bg-slate-50 dark:bg-white/[0.02]" : ""
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                <span className="font-semibold text-slate-650 dark:text-slate-350 truncate">{sec.label}</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                {sec.value.toLocaleString()} ({(sec.percentage * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Doughnut SVG Container */}
      <div className="relative shrink-0 flex items-center justify-center size-[150px]">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 150 150">
          {sectors.map((sec, idx) => (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={sec.color}
              strokeWidth={hoveredIdx === idx ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={sec.strokeDasharray}
              strokeDashoffset={sec.strokeDashoffset}
              strokeLinecap={sec.percentage > 0.05 ? "round" : "butt"}
              className="transition-all duration-150 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {hoveredIdx !== null ? (
            <>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate max-w-[90px]">
                {sectors[hoveredIdx].label}
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                {sectors[hoveredIdx].value.toLocaleString()}
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                {total.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function InteractiveComboChart({ title, data, color = "#3b82f6", secondaryColor = "#f43f5e", height = 200 }: CommonChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value)) || 10;
  const maxSecondaryVal = Math.max(...data.map((d) => d.secondaryValue || 0)) || 10;

  const padding = 30;
  const svgWidth = 500;
  const svgHeight = height;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  const spacing = graphWidth / data.length;
  const barWidth = Math.min(20, spacing - 10);

  // Line points coordinates
  const linePoints = data.map((d, idx) => {
    const x = padding + idx * spacing + spacing / 2;
    const y = padding + graphHeight - ((d.secondaryValue || 0) * graphHeight) / maxSecondaryVal;
    return { x, y, label: d.label, value: d.value, secondaryValue: d.secondaryValue };
  });

  const pathD = linePoints.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const handleMouseMove = (e: React.MouseEvent, idx: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top - 45
    });
    setHoveredIdx(idx);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl border border-slate-150 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 transition-all duration-300"
    >
      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">
        {title}
      </h3>
      <div className="relative">
        <svg className="w-full h-48" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
          {/* Grid lines */}
          {Array.from({ length: 4 }).map((_, i) => {
            const y = padding + (i * graphHeight) / 3;
            return (
              <line
                key={i}
                x1={padding}
                y1={y}
                x2={svgWidth - padding}
                y2={y}
                stroke="currentColor"
                className="text-slate-100 dark:text-white/[0.04]"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Bar Rects representing Primary Value (e.g. MAU) */}
          {data.map((d, idx) => {
            const barHeight = (d.value * graphHeight) / maxVal;
            const x = padding + idx * spacing + (spacing - barWidth) / 2;
            const y = padding + graphHeight - barHeight;

            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={color}
                opacity={hoveredIdx === idx ? 1.0 : 0.75}
                className="transition-all duration-150 cursor-pointer"
                onMouseMove={(e) => handleMouseMove(e, idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {/* Line Path overlay representing Secondary Value (e.g. New Registrations) */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Line Dots */}
          {linePoints.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === idx ? "5" : "3.5"}
              fill={secondaryColor}
              stroke="#ffffff"
              strokeWidth="1.5"
              className="cursor-pointer transition-all duration-150"
              onMouseMove={(e) => handleMouseMove(e, idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {hoveredIdx !== null && (
          <div
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
            className="absolute z-10 pointer-events-none rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-md dark:bg-ink-950 dark:border dark:border-white/5 animate-fade-in"
          >
            <span className="block text-[8px] text-slate-400 font-semibold">{data[hoveredIdx].label}</span>
            <span className="block text-indigo-400 font-semibold">Active: {data[hoveredIdx].value.toLocaleString()}</span>
            {data[hoveredIdx].secondaryValue !== undefined && (
              <span className="block text-rose-400 font-semibold">New: {data[hoveredIdx].secondaryValue?.toLocaleString()}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-between px-4 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {data.map((d, index) => (
          <span key={index}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
