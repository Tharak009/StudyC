import { type ReactNode } from "react";

interface ChartCardProps {
  title: string;
  type: "area" | "bar" | "line" | "combo";
  children?: ReactNode;
}

export function ChartCard({ title, type }: ChartCardProps) {
  // SVG Chart 1: User Growth (Area Curve)
  const renderAreaChart = () => (
    <svg className="w-full h-48" viewBox="0 0 500 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      <line x1="0" y1="50" x2="500" y2="50" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      <line x1="0" y1="150" x2="500" y2="150" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      
      {/* Filled Area */}
      <path
        d="M 0 160 Q 100 130 180 100 T 320 60 T 420 30 T 500 20 L 500 200 L 0 200 Z"
        fill="url(#area-grad)"
      />
      {/* Stroke Line */}
      <path
        d="M 0 160 Q 100 130 180 100 T 320 60 T 420 30 T 500 20"
        fill="none"
        stroke="#6366f1"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Target Points */}
      <circle cx="180" cy="100" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
      <circle cx="320" cy="60" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
      <circle cx="500" cy="20" r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
    </svg>
  );

  // SVG Chart 2: Community Growth (Vertical Bars)
  const renderBarChart = () => (
    <svg className="w-full h-48" viewBox="0 0 500 200" preserveAspectRatio="none">
      <line x1="0" y1="50" x2="500" y2="50" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      <line x1="0" y1="150" x2="500" y2="150" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      
      {/* 6 Bars representing different departments */}
      <rect x="35" y="120" width="30" height="80" rx="6" fill="#8b5cf6" className="opacity-90 hover:opacity-100 transition-all" />
      <rect x="115" y="90" width="30" height="110" rx="6" fill="#8b5cf6" className="opacity-90 hover:opacity-100 transition-all" />
      <rect x="195" y="60" width="30" height="140" rx="6" fill="#8b5cf6" className="opacity-90 hover:opacity-100 transition-all" />
      <rect x="275" y="105" width="30" height="95" rx="6" fill="#8b5cf6" className="opacity-90 hover:opacity-100 transition-all" />
      <rect x="355" y="40" width="30" height="160" rx="6" fill="#8b5cf6" className="opacity-90 hover:opacity-100 transition-all" />
      <rect x="435" y="75" width="30" height="125" rx="6" fill="#8b5cf6" className="opacity-90 hover:opacity-100 transition-all" />
    </svg>
  );

  // SVG Chart 3: Event Activity (Line Nodes)
  const renderLineChart = () => (
    <svg className="w-full h-48" viewBox="0 0 500 200" preserveAspectRatio="none">
      <line x1="0" y1="50" x2="500" y2="50" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      <line x1="0" y1="150" x2="500" y2="150" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />

      {/* Cyan Zigzag Line */}
      <path
        d="M 20 140 L 100 110 L 180 150 L 260 70 L 340 90 L 420 40 L 480 30"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Node Indicators */}
      {[
        { x: 20, y: 140 },
        { x: 100, y: 110 },
        { x: 180, y: 150 },
        { x: 260, y: 70 },
        { x: 340, y: 90 },
        { x: 420, y: 40 },
        { x: 480, y: 30 }
      ].map((pt, idx) => (
        <circle key={idx} cx={pt.x} cy={pt.y} r="4.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
      ))}
    </svg>
  );

  // SVG Chart 4: Daily Active Users (Combo Bar + Line)
  const renderComboChart = () => (
    <svg className="w-full h-48" viewBox="0 0 500 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="combo-bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <line x1="0" y1="50" x2="500" y2="50" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />
      <line x1="0" y1="150" x2="500" y2="150" stroke="currentColor" className="text-slate-100 dark:text-white/5" strokeDasharray="4 4" />

      {/* Combo Bars */}
      <rect x="40" y="90" width="16" height="110" rx="3" fill="url(#combo-bar-grad)" />
      <rect x="120" y="110" width="16" height="90" rx="3" fill="url(#combo-bar-grad)" />
      <rect x="200" y="70" width="16" height="130" rx="3" fill="url(#combo-bar-grad)" />
      <rect x="280" y="50" width="16" height="150" rx="3" fill="url(#combo-bar-grad)" />
      <rect x="360" y="85" width="16" height="115" rx="3" fill="url(#combo-bar-grad)" />
      <rect x="440" y="60" width="16" height="140" rx="3" fill="url(#combo-bar-grad)" />

      {/* Trend Line overlay */}
      <path
        d="M 48 100 Q 128 80 208 60 T 368 75 T 448 50"
        fill="none"
        stroke="#f43f5e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );

  const charts = {
    area: renderAreaChart,
    bar: renderBarChart,
    line: renderLineChart,
    combo: renderComboChart
  };

  const xLabels = {
    area: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    bar: ["CS", "EC", "ME", "EE", "IT", "CE"],
    line: ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7"],
    combo: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  };

  return (
    <div className="rounded-2xl border border-slate-150 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-ink-900 transition-all duration-300">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">{title}</h3>
      <div className="relative">
        {charts[type]()}
      </div>
      {/* X Axis Labels */}
      <div className="mt-3 flex justify-between px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
        {xLabels[type].map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
}
