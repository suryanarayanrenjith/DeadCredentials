"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ThreatActorProfileProps {
  score: number;
  breachCount: number;
  visible: boolean;
}

interface ThreatActor {
  name: string;
  avatar: string;
  tool: string;
  time: string;
  quote: string;
  level: string;
  color: string;
  bgGlow: string;
}

function getThreatActor(score: number, breachCount: number): ThreatActor {
  if (score <= 20 || breachCount > 1_000_000) {
    return {
      name: "Script Kiddie",
      avatar: "😈",
      tool: "Hashcat + RockYou wordlist",
      time: "Under 1 second",
      quote: "lol this password cracked itself",
      level: "LEVEL 1 — AMATEUR",
      color: "#dc2626",
      bgGlow: "#dc262615",
    };
  }
  if (score <= 40 || breachCount > 10_000) {
    return {
      name: "Opportunistic Cybercriminal",
      avatar: "🦹",
      tool: "Credential stuffing bot",
      time: "Already in a breach list",
      quote: "I didn't even have to try",
      level: "LEVEL 2 — OPPORTUNIST",
      color: "#f97316",
      bgGlow: "#f9731615",
    };
  }
  if (score <= 60) {
    return {
      name: "Professional Hacker",
      avatar: "💻",
      tool: "Custom GPU rig + rainbow tables",
      time: "Minutes to hours",
      quote: "A warm up exercise at best",
      level: "LEVEL 3 — PROFESSIONAL",
      color: "#f59e0b",
      bgGlow: "#f59e0b15",
    };
  }
  if (score <= 80) {
    return {
      name: "Nation-State APT Group",
      avatar: "🏛️",
      tool: "Distributed cracking cluster",
      time: "Days to weeks",
      quote: "Only worth our time for high value targets",
      level: "LEVEL 4 — STATE ACTOR",
      color: "#8b5cf6",
      bgGlow: "#8b5cf615",
    };
  }
  return {
    name: "UNCRACKABLE",
    avatar: "🛡️",
    tool: "No known tool",
    time: "Longer than the universe exists",
    quote: "We have given up. You win.",
    level: "LEVEL 5 — IMPERVIOUS",
    color: "#10b981",
    bgGlow: "#10b98115",
  };
}

/** Fake redacted text for classified document effect */
function RedactedBar({ width }: { width: string }) {
  return (
    <span
      className="inline-block rounded-sm align-middle"
      style={{
        width,
        height: "0.7em",
        backgroundColor: "#e8e8ea",
        opacity: 0.12,
      }}
    />
  );
}

export default function ThreatActorProfile({ score, breachCount, visible }: ThreatActorProfileProps) {
  const [stampVisible, setStampVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setStampVisible(true), 600);
      return () => clearTimeout(timer);
    }
    setStampVisible(false);
  }, [visible]);

  if (!visible) return null;

  const actor = getThreatActor(score, breachCount);

  return (
    <div className="w-full max-w-lg mx-auto mt-5 animate-fade-in-up">
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{
          background: `linear-gradient(145deg, #111114 0%, #0c0c0f 50%, #111114 100%)`,
          borderColor: `${actor.color}25`,
        }}
      >
        {/* Classified document texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, #ffffff 20px),
                            repeating-linear-gradient(90deg, transparent, transparent 19px, #ffffff 20px)`,
        }} />

        {/* CLASSIFIED stamp */}
        <AnimatePresence>
          {stampVisible && (
            <motion.div
              className="absolute top-4 right-4 z-20 select-none pointer-events-none"
              initial={{ scale: 3, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: -12 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                duration: 0.4,
              }}
            >
              <div
                className="px-4 py-1.5 border-2 rounded-sm font-mono font-black text-sm tracking-[0.2em] uppercase"
                style={{
                  color: actor.color,
                  borderColor: actor.color,
                  opacity: 0.7,
                  textShadow: `0 0 10px ${actor.color}40`,
                }}
              >
                CLASSIFIED
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={actor.color} strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: actor.color }}>
              Threat Assessment
            </span>
          </div>

          {/* Fake redacted line */}
          <div className="flex items-center gap-2 text-[9px] text-[#52525b] mb-4 font-mono">
            <span>CASE NO.</span>
            <RedactedBar width="60px" />
            <span>REF:</span>
            <RedactedBar width="80px" />
            <span>DATE:</span>
            <RedactedBar width="50px" />
          </div>

          {/* Actor card */}
          <motion.div
            className="flex items-start gap-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Avatar */}
            <div
              className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
              style={{
                background: actor.bgGlow,
                border: `1px solid ${actor.color}30`,
                boxShadow: `0 0 20px ${actor.color}10`,
              }}
            >
              {actor.avatar}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-mono uppercase tracking-[0.15em] mb-1" style={{ color: `${actor.color}90` }}>
                {actor.level}
              </div>
              <h4 className="text-base font-bold text-[#e8e8ea] tracking-wide mb-2">
                {actor.name}
              </h4>

              {/* Detail rows */}
              <div className="space-y-1.5">
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-[#52525b] flex-shrink-0 w-12 font-mono uppercase text-[9px] pt-0.5">Tool</span>
                  <span className="text-[#a1a1aa]">{actor.tool}</span>
                </div>
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-[#52525b] flex-shrink-0 w-12 font-mono uppercase text-[9px] pt-0.5">ETA</span>
                  <span className="font-semibold" style={{ color: actor.color }}>{actor.time}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quote */}
          <motion.div
            className="mt-4 pt-3 border-t"
            style={{ borderColor: `${actor.color}15` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none mt-0.5" style={{ color: `${actor.color}40` }}>&ldquo;</span>
              <p
                className="text-xs italic leading-relaxed"
                style={{ color: `${actor.color}`, fontFamily: "var(--font-obituary)" }}
              >
                {actor.quote}
              </p>
              <span className="text-lg leading-none mt-0.5" style={{ color: `${actor.color}40` }}>&rdquo;</span>
            </div>
          </motion.div>

          {/* Redacted footer lines — decoration */}
          <motion.div
            className="mt-4 space-y-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-[#3f3f46]">OPERATOR:</span>
              <RedactedBar width="100px" />
              <span className="text-[8px] font-mono text-[#3f3f46]">AUTH:</span>
              <RedactedBar width="40px" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-[#3f3f46]">CLEARANCE:</span>
              <RedactedBar width="70px" />
              <span className="text-[8px] font-mono text-[#3f3f46]">DIVISION:</span>
              <RedactedBar width="90px" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
