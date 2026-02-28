"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface StrengthMeterProps {
  score: number; // 0–100
  crackTime: string;
  visible: boolean;
}

function getHealthColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#dc2626";
}

function getHealthLabel(score: number): string {
  if (score >= 80) return "Alive & Well";
  if (score >= 60) return "Feeling Sick";
  if (score >= 40) return "Critical Condition";
  if (score >= 20) return "On Life Support";
  return "Dead on Arrival";
}

function getHealthIcon(score: number): string {
  if (score >= 80) return "💪";
  if (score >= 60) return "🤒";
  if (score >= 40) return "🏥";
  if (score >= 20) return "☠️";
  return "⚰️";
}

/* EKG (heartbeat) line SVG — speed/flatline based on score */
function EKGLine({ score, color }: { score: number; color: string }) {
  // Dead passwords get a flatline, alive ones get a heartbeat
  const path =
    score <= 10
      ? "M0,25 L180,25" // flatline
      : score <= 30
        ? "M0,25 L40,25 L50,20 L55,30 L60,25 L180,25" // weak blip
        : score <= 60
          ? "M0,25 L25,25 L33,15 L38,35 L42,10 L47,40 L52,25 L90,25 L98,15 L103,35 L107,10 L112,40 L117,25 L180,25" // moderate
          : "M0,25 L15,25 L22,12 L27,38 L30,5 L34,45 L38,25 L55,25 L62,12 L67,38 L70,5 L74,45 L78,25 L100,25 L107,12 L112,38 L115,5 L119,45 L123,25 L150,25 L157,12 L162,38 L165,5 L169,45 L173,25 L180,25"; // strong heartbeat

  const speed = score <= 10 ? "0s" : score <= 30 ? "4s" : score <= 60 ? "2.5s" : "1.5s";

  return (
    <div className="w-full h-[50px] mt-2 mb-1 overflow-hidden rounded-xl bg-[#0c0c0f] border border-[#1e1e24] relative">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none" viewBox="0 0 180 50">
        {[0, 1, 2, 3, 4].map(i => (
          <line key={`h${i}`} x1="0" y1={i * 12.5} x2="180" y2={i * 12.5} stroke="#ffffff" strokeWidth="0.3" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="50" stroke="#ffffff" strokeWidth="0.3" />
        ))}
      </svg>
      {/* EKG trace */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 180 50"
        preserveAspectRatio="none"
      >
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
          style={{
            strokeDasharray: 500,
            strokeDashoffset: 500,
            animation: `ekgDraw 1.5s ease-out forwards${speed !== "0s" ? `, ekgPulse ${speed} ease-in-out 1.5s infinite` : ""}`,
          }}
        />
        {/* Glow version */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.15"
          style={{
            filter: "blur(3px)",
            strokeDasharray: 500,
            strokeDashoffset: 500,
            animation: `ekgDraw 1.5s ease-out forwards${speed !== "0s" ? `, ekgPulse ${speed} ease-in-out 1.5s infinite` : ""}`,
          }}
        />
      </svg>
      {/* Status label */}
      <div className="absolute top-1 right-2 text-[9px] font-mono uppercase tracking-widest" style={{ color, opacity: 0.5 }}>
        {score <= 10 ? "flatline" : "vitals"}
      </div>
    </div>
  );
}

export default function StrengthMeter({ score, crackTime, visible }: StrengthMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(100);

  useEffect(() => {
    if (visible) {
      const timeout = setTimeout(() => {
        setAnimatedScore(score);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setAnimatedScore(100);
    }
  }, [score, visible]);

  if (!visible) return null;

  const color = getHealthColor(score);
  const label = getHealthLabel(score);
  const icon = getHealthIcon(score);

  return (
    <motion.div
      className="w-full max-w-lg mx-auto mt-6"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="bg-[#111114] border border-[#1e1e24] rounded-2xl p-5 gradient-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#e8e8ea] flex items-center gap-2">
            <span className="text-base">{icon}</span>
            Health Status: <span className="font-bold" style={{ color }}>{label}</span>
          </span>
          <motion.span
            className="text-sm font-mono font-bold px-2.5 py-0.5 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.3 }}
            style={{
              color,
              backgroundColor: `${color}15`,
              border: `1px solid ${color}30`,
            }}
          >
            {score}/100
          </motion.span>
        </div>

        {/* Health Bar */}
        <div className="w-full h-3.5 bg-[#0c0c0f] rounded-full overflow-hidden border border-[#1e1e24]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${animatedScore}%`,
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}50, inset 0 1px 0 rgba(255,255,255,0.15)`,
              transition: "width 1.5s ease-out, background-color 0.3s",
              backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%)`,
            }}
          />
        </div>

        {/* EKG Heartbeat Line */}
        <EKGLine score={score} color={color} />

        {/* Crack Time */}
        <motion.div
          className="mt-2 flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <span className="text-[11px] text-[#71717a] uppercase tracking-wider font-medium">Time to crack</span>
          <span className="text-xs font-mono text-[#a1a1aa] font-semibold bg-[#0c0c0f] px-2.5 py-1 rounded-lg border border-[#1e1e24]">
            {crackTime}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
