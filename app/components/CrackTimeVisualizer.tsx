"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";

interface CrackTimeVisualizerProps {
  crackTime: string;
  score: number;
  visible: boolean;
}

/** Convert human-readable crack time string to seconds */
function crackTimeToSeconds(crackTime: string): number {
  const lower = crackTime.toLowerCase();
  if (lower.includes("instantly") || lower === "instant") return 0;

  const numMatch = lower.match(/([\d.]+)/);
  const num = numMatch ? parseFloat(numMatch[1]) : 1;

  if (lower.includes("millisecond")) return num / 1000;
  if (lower.includes("second")) return num;
  if (lower.includes("minute")) return num * 60;
  if (lower.includes("hour")) return num * 3600;
  if (lower.includes("day")) return num * 86400;
  if (lower.includes("week")) return num * 604800;
  if (lower.includes("month")) return num * 2592000;
  if (lower.includes("year")) {
    if (lower.includes("trillion")) return num * 1e12 * 31536000;
    if (lower.includes("billion")) return num * 1e9 * 31536000;
    if (lower.includes("million")) return num * 1e6 * 31536000;
    if (lower.includes("thousand")) return num * 1e3 * 31536000;
    return num * 31536000;
  }
  if (lower.includes("centur")) return num * 100 * 31536000;
  return 0;
}

function getRealTimeRef(seconds: number): { gpu: string; botnet: string } {
  if (seconds <= 0) return { gpu: "Instantly", botnet: "Instantly" };
  if (seconds < 0.001) return { gpu: `${(seconds * 1000).toFixed(2)}ms on a consumer GPU`, botnet: `${(seconds * 1000000).toFixed(0)}μs on a botnet` };
  if (seconds < 1) return { gpu: `${seconds.toFixed(2)}s on a consumer GPU`, botnet: `${(seconds * 0.001).toFixed(4)}s on a botnet` };
  if (seconds < 60) return { gpu: `${seconds.toFixed(1)} seconds on a consumer GPU`, botnet: `${(seconds * 0.001).toFixed(2)} seconds on a botnet` };
  if (seconds < 3600) return { gpu: `${(seconds / 60).toFixed(1)} minutes on a consumer GPU`, botnet: `${(seconds / 60 * 0.001).toFixed(2)} minutes on a botnet` };
  if (seconds < 86400) return { gpu: `${(seconds / 3600).toFixed(1)} hours on a consumer GPU`, botnet: `${(seconds / 3600 * 0.01).toFixed(1)} hours on a botnet` };
  if (seconds < 31536000) return { gpu: `${(seconds / 86400).toFixed(0)} days on a consumer GPU`, botnet: `${(seconds / 86400 * 0.001).toFixed(1)} days on a botnet` };
  const years = seconds / 31536000;
  if (years < 1000) return { gpu: `${years.toFixed(0)} years on a consumer GPU`, botnet: `${(years * 0.001).toFixed(1)} years on a botnet` };
  if (years < 1e6) return { gpu: `${(years / 1000).toFixed(0)}K years on a consumer GPU`, botnet: `${(years / 1e6).toFixed(2)}M years on a botnet` };
  return { gpu: `${(years / 1e6).toFixed(0)}M+ years on a consumer GPU`, botnet: `${(years / 1e9).toFixed(0)}B+ years on a botnet` };
}

function getPopCultureRef(seconds: number): string {
  if (seconds < 1) return "Less time than it takes to say \"password\"";
  if (seconds < 60) return "Before your microwave finishes heating";
  if (seconds < 3600) return "During a single Netflix episode";
  if (seconds < 86400) return "While you sleep";
  if (seconds < 31536000) return "Before your phone needs charging 365 times";
  const years = seconds / 31536000;
  if (years < 100) return "Not in your lifetime";
  return "Long after the sun burns out";
}

function getHistoricalRef(seconds: number): string {
  if (seconds < 1) return "Cracked before the first computer was invented";
  if (seconds < 86400) return "Cracked during the moon landing broadcast";
  if (seconds < 31536000) return "Cracked during World War II";
  const years = seconds / 31536000;
  if (years < 100) return "Cracked before your grandchildren graduate";
  return "Still safe when humans land on Mars";
}

function getTimelineBarConfig(seconds: number): { fillDuration: number; fillPercent: number; showInfinity: boolean; flashFill: boolean } {
  // Logarithmic scale: maps crack time smoothly across the bar
  // log10 range: -1 (0.1s) to ~16 (trillions of years) → 2% to 100%
  if (seconds <= 0) return { fillDuration: 0.3, fillPercent: 2, showInfinity: false, flashFill: true };

  const log = Math.log10(Math.max(seconds, 0.1));
  // Map log10 range [-1 .. 15] → [2% .. 100%]
  const pct = Math.min(100, Math.max(2, ((log + 1) / 16) * 98 + 2));
  const isInstant = seconds < 1;
  const isForever = seconds > 1e15; // ~31M+ years

  // Animation duration scales with fill amount
  const dur = isInstant ? 0.3 : Math.min(3.5, 0.8 + (pct / 100) * 2.5);

  return {
    fillDuration: dur,
    fillPercent: Math.round(pct * 10) / 10,
    showInfinity: isForever,
    flashFill: isInstant,
  };
}

function getBarColor(seconds: number): string {
  if (seconds < 1) return "#dc2626";
  if (seconds < 60) return "#f97316";
  if (seconds < 3600) return "#f59e0b";
  if (seconds < 86400) return "#eab308";
  if (seconds < 31536000) return "#84cc16";
  const years = seconds / 31536000;
  if (years < 100) return "#22c55e";
  return "#10b981";
}

export default function CrackTimeVisualizer({ crackTime, score, visible }: CrackTimeVisualizerProps) {
  const [barWidth, setBarWidth] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const prevCrackTime = useRef(crackTime);

  const seconds = useMemo(() => crackTimeToSeconds(crackTime), [crackTime]);
  const realTime = useMemo(() => getRealTimeRef(seconds), [seconds]);
  const popCulture = useMemo(() => getPopCultureRef(seconds), [seconds]);
  const historical = useMemo(() => getHistoricalRef(seconds), [seconds]);
  const config = useMemo(() => getTimelineBarConfig(seconds), [seconds]);
  const barColor = useMemo(() => getBarColor(seconds), [seconds]);

  useEffect(() => {
    if (!visible) {
      setBarWidth(0);
      setShowFlash(false);
      return;
    }

    // Reset bar to 0 first so the animation replays on every new crack time
    const isNewCrack = prevCrackTime.current !== crackTime;
    prevCrackTime.current = crackTime;

    if (isNewCrack) {
      setBarWidth(0);
      setShowFlash(false);
    }

    // Animate to target after a brief reset gap
    const delay = isNewCrack ? 150 : 200;
    const timer = setTimeout(() => {
      if (config.flashFill) {
        setShowFlash(true);
        setBarWidth(config.fillPercent);
        setTimeout(() => setShowFlash(false), 600);
      } else {
        setBarWidth(config.fillPercent);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [visible, crackTime, config]);

  if (!visible) return null;

  const referenceFrames = [
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
      label: "TECHNICAL",
      lines: [realTime.gpu, realTime.botnet],
      color: "#dc2626",
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
      label: "POP CULTURE",
      lines: [popCulture],
      color: "#f59e0b",
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      label: "HISTORICAL",
      lines: [historical],
      color: "#8b5cf6",
    },
  ];

  return (
    <motion.div
      className="w-full max-w-lg mx-auto mt-4"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="bg-[#111114] border border-[#1e1e24] rounded-2xl p-5 gradient-border relative overflow-hidden">
        {/* Flash overlay for instant cracks */}
        {showFlash && (
          <div
            className="absolute inset-0 z-20 rounded-2xl pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${barColor}30 0%, transparent 70%)`,
              animation: "crack-flash 0.6s ease-out forwards",
            }}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span className="text-sm font-semibold text-[#e8e8ea]">Crack Time Analysis</span>
          </div>
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{
              color: barColor,
              backgroundColor: `${barColor}10`,
              borderColor: `${barColor}30`,
            }}
          >
            {crackTime}
          </span>
        </div>

        {/* Timeline bar */}
        <div className="relative mb-5">
          <div className="w-full h-3 bg-[#0c0c0f] rounded-full overflow-hidden border border-[#1e1e24]">
            <div
              className="h-full rounded-full relative"
              style={{
                width: `${barWidth}%`,
                backgroundColor: barColor,
                boxShadow: `0 0 12px ${barColor}40, inset 0 1px 0 rgba(255,255,255,0.15)`,
                transition: `width ${config.fillDuration}s ${config.flashFill ? "ease-out" : "cubic-bezier(0.16, 1, 0.3, 1)"}`,
                backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%)`,
              }}
            />
          </div>

          {/* Infinity symbol for very long times */}
          {config.showInfinity && (
            <div className="absolute right-0 -top-0.5 flex items-center gap-1">
              <span className="text-lg font-bold" style={{ color: barColor }}>∞</span>
            </div>
          )}

          {/* Time labels */}
          <div className="flex justify-between mt-1.5">
            <span className="text-[8px] font-mono text-[#52525b]">0s</span>
            <span className="text-[8px] font-mono text-[#52525b]">1min</span>
            <span className="text-[8px] font-mono text-[#52525b]">1hr</span>
            <span className="text-[8px] font-mono text-[#52525b]">1day</span>
            <span className="text-[8px] font-mono text-[#52525b]">1yr</span>
            <span className="text-[8px] font-mono text-[#52525b]">100yr+</span>
          </div>
        </div>

        {/* Reference frames */}
        <div className="space-y-3">
          {referenceFrames.map((frame, i) => (
            <motion.div
              key={i}
              className="rounded-xl p-3 border transition-all duration-300"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.02, x: 4 }}
              style={{
                backgroundColor: `${frame.color}06`,
                borderColor: `${frame.color}15`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {frame.icon}
                <span className="text-[9px] font-mono uppercase tracking-[0.15em]" style={{ color: `${frame.color}80` }}>
                  {frame.label}
                </span>
              </div>
              <div className="space-y-1">
                {frame.lines.map((line, j) => (
                  <p key={j} className="text-[11px] text-[#a1a1aa] leading-relaxed pl-[22px]">
                    {line}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
