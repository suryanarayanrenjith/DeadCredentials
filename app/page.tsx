"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PasswordInput from "@/app/components/PasswordInput";
import StrengthMeter from "@/app/components/StrengthMeter";
import ObituaryCard from "@/app/components/ObituaryCard";
import SurvivalCard from "@/app/components/SurvivalCard";
import ReincarnationBox from "@/app/components/ReincarnationBox";
import ThreatActorProfile from "@/app/components/ThreatActorProfile";
import CrackTimeVisualizer from "@/app/components/CrackTimeVisualizer";
import SkullConfetti from "@/app/components/SkullConfetti";
import BatchProcessor from "@/app/components/BatchProcessor";
import PasswordGenerator from "@/app/components/PasswordGenerator";
import TrustPanel from "@/app/components/TrustPanel";
import AnimatedBackground from "@/app/components/AnimatedBackground";
import type { PasswordCharacteristics } from "@/lib/passwordAnalyzer";
import { analyzePassword, analyzePasswordDNA, type DNASegment } from "@/lib/passwordAnalyzer";
import { checkPasswordBreach } from "@/lib/hibpClient";
import { maskPassword } from "@/lib/passwordUtils";
import { streamObituary } from "@/lib/obituaryClient";
import type { ToneOption } from "@/lib/types";

type AppMode = "single" | "batch" | "generator";

interface AnalysisData {
  breachCount: number;
  characteristics: PasswordCharacteristics;
  maskedPassword: string;
  dnaSegments?: DNASegment[];
  hashPrefix?: string;
  breachCheckFailed?: boolean;
}

interface GraveyardEntry {
  maskedPassword: string;
  score: number;
  alive: boolean;
  timestamp: number;
}

/* ── Custom SVG logo (skull + key) ── */
function LogoSVG() {
  return (
    <div className="relative">
      {/* Pulse ring */}
      <div className="absolute inset-0 rounded-full animate-logo-ring" />
      <svg
        width="56"
        height="56"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_24px_rgba(220,38,38,0.4)] animate-float-slow relative z-10"
      >
        <defs>
          <radialGradient id="skull-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="31" fill="url(#skull-glow)" />
        <circle cx="32" cy="32" r="29" fill="#0c0c0f" stroke="#dc2626" strokeWidth="1.5" opacity="0.85" />
        <path
          d="M32 10C21 10 14 18 14 27C14 33 17 37.5 22 40V46C22 47.1 22.9 48 24 48H40C41.1 48 42 47.1 42 46V40C47 37.5 50 33 50 27C50 18 43 10 32 10Z"
          fill="#18181b"
          stroke="#dc2626"
          strokeWidth="1.5"
        />
        <ellipse cx="25" cy="27" rx="4" ry="4.5" fill="#dc2626" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.6;0.9" dur="3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="39" cy="27" rx="4" ry="4.5" fill="#dc2626" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.6;0.9" dur="3s" repeatCount="indefinite" />
        </ellipse>
        <path d="M30 35L32 38L34 35" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <line x1="27" y1="44" x2="27" y2="48" stroke="#dc2626" strokeWidth="0.8" opacity="0.6" />
        <line x1="32" y1="44" x2="32" y2="48" stroke="#dc2626" strokeWidth="0.8" opacity="0.6" />
        <line x1="37" y1="44" x2="37" y2="48" stroke="#dc2626" strokeWidth="0.8" opacity="0.6" />
        <path d="M22 44H42" stroke="#dc2626" strokeWidth="0.8" opacity="0.5" />
        {/* Keyhole */}
        <circle cx="32" cy="19" r="2.2" fill="#dc2626" opacity="0.45" />
        <rect x="31" y="19" width="2" height="4.5" rx="0.5" fill="#dc2626" opacity="0.45" />
      </svg>
    </div>
  );
}

/* ── Typewriter effect for subtitle ── */
function TypewriterText({ texts }: { texts: string[] }) {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIndex];
    const speed = isDeleting ? 30 : 60;
    const pause = isDeleting && charIndex === 0 ? 400 : !isDeleting && charIndex === current.length ? 2500 : 0;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < current.length) {
        setDisplayText(current.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (!isDeleting && charIndex === current.length) {
        setIsDeleting(true);
      } else if (isDeleting && charIndex > 0) {
        setDisplayText(current.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else {
        setIsDeleting(false);
        setTextIndex((textIndex + 1) % texts.length);
      }
    }, pause || speed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, textIndex, texts]);

  return (
    <span className="text-[#71717a] text-sm md:text-base">
      {displayText}
      <span className="cursor-blink text-[#dc2626]">|</span>
    </span>
  );
}

/* ── Password Vault (history) ── */
function PasswordGraveyard({ entries, onClear }: { entries: GraveyardEntry[]; onClear: () => void }) {
  if (entries.length === 0) return null;

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto mt-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="bg-[#0c0c0f]/80 backdrop-blur-sm border border-[#1e1e24] rounded-2xl p-5 gradient-border hover-lift">
        <h3 className="text-sm font-semibold text-[#e8e8ea] mb-4 flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="tracking-wide">Password Vault</span>
          <span className="text-[10px] text-[#52525b] ml-auto font-mono">{entries.length} checked</span>
          <button
            onClick={onClear}
            className="ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium tracking-wide
              text-[#71717a] hover:text-[#dc2626] bg-[#18181b] hover:bg-[#dc262610] border border-[#27272a] hover:border-[#dc262640]
              transition-all duration-200 cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Clear All
          </button>
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {entries.map((entry) => (
            <motion.div
              key={entry.timestamp}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-[#111114]/80 border border-[#1a1a20] hover:border-[#2a2a32] hover:bg-[#18181c] transition-all duration-200 hover-lift"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{entry.alive ? "🛡️" : "💀"}</span>
                <span className="font-mono text-sm text-[#d4d4d8]">{entry.maskedPassword}</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="h-1.5 w-16 rounded-full bg-[#1e1e24] overflow-hidden"
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${entry.score}%`,
                      backgroundColor: entry.score >= 80 ? "#10b981" : entry.score >= 40 ? "#f59e0b" : "#dc2626",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-mono font-bold min-w-[32px] text-right"
                  style={{
                    color: entry.alive ? "#10b981" : "#dc2626",
                  }}
                >
                  {entry.score}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Detail Breakdown Panel ── */
function BreakdownPanel({ characteristics }: { characteristics: PasswordCharacteristics }) {
  const checks = [
    { label: "Uppercase letters", pass: characteristics.hasUppercase, icon: "A-Z" },
    { label: "Lowercase letters", pass: characteristics.hasLowercase, icon: "a-z" },
    { label: "Numbers", pass: characteristics.hasNumbers, icon: "0-9" },
    { label: "Special characters", pass: characteristics.hasSymbols, icon: "!@#" },
    { label: "Not a common password", pass: !characteristics.isCommon, icon: "🔒" },
    { label: "No keyboard patterns", pass: !characteristics.hasKeyboardPattern, icon: "⌨️" },
    { label: "No repeating chars", pass: !characteristics.hasRepeatingChars, icon: "🔄" },
    { label: "No sequential numbers", pass: !characteristics.hasSequentialNumbers, icon: "🔢" },
    { label: "8+ characters", pass: characteristics.length >= 8, icon: "📏" },
    { label: "12+ characters (ideal)", pass: characteristics.length >= 12, icon: "📐" },
  ];

  const passCount = checks.filter(c => c.pass).length;

  return (
    <div className="w-full max-w-lg mx-auto mt-4">
      <details className="group bg-[#111114]/80 backdrop-blur-sm border border-[#1e1e24] rounded-2xl gradient-border hover-lift">
        <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#18181c] rounded-2xl transition-colors duration-200">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span className="text-sm font-semibold text-[#e8e8ea]">Security Breakdown</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#71717a]">{passCount}/{checks.length}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" className="group-open:rotate-180 transition-transform duration-300">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </summary>
        <div className="px-4 pb-4 pt-1 border-t border-[#1e1e24]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3">
            {checks.map((check, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg text-xs transition-all duration-200 ${
                  check.pass ? "text-[#a1a1aa]" : "text-[#71717a]"
                }`}
              >
                <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  check.pass
                    ? "bg-[#10b98120] text-[#10b981]"
                    : "bg-[#dc262615] text-[#dc2626]"
                }`}>
                  {check.pass ? "✓" : "✗"}
                </span>
                <span className="font-mono text-[10px] text-[#52525b] w-6">{check.icon}</span>
                <span>{check.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Pattern tags */}
          {characteristics.patterns.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#1e1e24]">
              <div className="text-[10px] text-[#71717a] uppercase tracking-wider mb-2 font-medium">Detected Patterns</div>
              <div className="flex flex-wrap gap-1.5">
                {characteristics.patterns.map((p, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-[#dc262610] text-[#ef4444] border border-[#dc262625] font-medium"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

/* ── Fun comparison stats (approximations for entertainment) ── */
function FunComparison({ score, crackTime }: { score: number; crackTime: string }) {
  const comparison = (() => {
    if (score >= 80) return { text: "Estimated stronger than ~94% of passwords", icon: "🏆" };
    if (score >= 60) return { text: "Estimated stronger than ~60% of passwords", icon: "📊" };
    if (score >= 40) return { text: "Likely weaker than the average password", icon: "📉" };
    if (score >= 20) return { text: "Estimated in the bottom ~20% of passwords", icon: "🚨" };
    return { text: "Among the weakest passwords ever created", icon: "💀" };
  })();

  const funFact = (() => {
    if (crackTime.includes("instantly") || crackTime.includes("second"))
      return "A hacker could crack this faster than you can say it";
    if (crackTime.includes("minute"))
      return "A coffee break is all a hacker needs";
    if (crackTime.includes("hour"))
      return "A bored hacker on a Sunday afternoon could crack this";
    if (crackTime.includes("day"))
      return "This wouldn't survive a long weekend of brute forcing";
    if (crackTime.includes("year") && !crackTime.includes("thousand") && !crackTime.includes("million"))
      return "Not bad, but dedicated hackers have patience";
    return "This would outlive most civilizations — well done";
  })();

  return (
    <div className="w-full max-w-lg mx-auto mt-3">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <motion.div
          className="flex-1 bg-[#111114]/80 backdrop-blur-sm border border-[#1e1e24] rounded-xl p-3.5 flex items-center gap-2.5 hover-lift"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ scale: 1.03, y: -2 }}
        >
          <span className="text-lg">{comparison.icon}</span>
          <span className="text-[11px] text-[#a1a1aa] leading-tight">{comparison.text}</span>
        </motion.div>
        <motion.div
          className="flex-1 bg-[#111114]/80 backdrop-blur-sm border border-[#1e1e24] rounded-xl p-3.5 flex items-center gap-2.5 hover-lift"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ scale: 1.03, y: -2 }}
        >
          <span className="text-lg">⚡</span>
          <span className="text-[11px] text-[#a1a1aa] leading-tight">{funFact}</span>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Tone Selector ── */
function ToneSelector({ tone, setTone }: { tone: ToneOption; setTone: (t: ToneOption) => void }) {
  const tones: { id: ToneOption; label: string; icon: string; desc: string }[] = [
    { id: "victorian", label: "Victorian", icon: "📰", desc: "Formal newspaper obituary" },
    { id: "roast", label: "Comedy Roast", icon: "🔥", desc: "Savage stand-up roast" },
    { id: "hollywood", label: "Hollywood", icon: "🎬", desc: "Cinematic dramatic finale" },
  ];

  return (
    <motion.div
      className="w-full max-w-lg mx-auto mt-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <div className="text-[10px] text-[#52525b] uppercase tracking-widest font-mono text-center mb-2.5">Obituary Tone</div>
      <div className="grid grid-cols-3 gap-2.5">
        {tones.map((t, i) => (
          <motion.button
            key={t.id}
            onClick={() => setTone(t.id)}
            aria-pressed={tone === t.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 * i + 0.2 }}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={`relative flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border text-xs transition-all duration-200 cursor-pointer backdrop-blur-sm ${
              tone === t.id
                ? "bg-[#dc262612] border-[#dc262660] text-[#e8e8ea] shadow-[0_0_20px_#dc262620,0_4px_16px_#dc262610]"
                : "bg-[#111114]/80 border-[#1e1e24] text-[#71717a] hover:border-[#2a2a32] hover:bg-[#18181c]"
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="font-semibold text-[11px]">{t.label}</span>
            <span className="text-[9px] text-[#52525b] leading-tight text-center">{t.desc}</span>
            {tone === t.id && (
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#dc2626] flex items-center justify-center shadow-[0_0_8px_#dc262660]"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Mode Switcher (Single / Batch / Generator) ── */
function ModeSwitcher({ mode, setMode }: { mode: AppMode; setMode: (m: AppMode) => void }) {
  const modes: { id: AppMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: "single",
      label: "Single Audit",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      desc: "Analyze one password",
    },
    {
      id: "batch",
      label: "Batch CSV",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      desc: "Audit up to 100",
    },
    {
      id: "generator",
      label: "Generator",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      desc: "Forge a strong one",
    },
  ];

  return (
    <motion.div
      className="w-full max-w-lg mx-auto mt-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="relative bg-[#0c0c0f]/60 backdrop-blur-sm border border-[#1e1e24] rounded-2xl p-1.5 flex gap-1.5" role="tablist" aria-label="Analysis mode">
        {modes.map((m) => (
          <motion.button
            key={m.id}
            onClick={() => setMode(m.id)}
            role="tab"
            aria-selected={mode === m.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-medium transition-colors duration-200 cursor-pointer z-10 ${
              mode === m.id ? "text-[#e8e8ea]" : "text-[#71717a] hover:text-[#a1a1aa]"
            }`}
          >
            {mode === m.id && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 rounded-xl bg-[#dc262612] border border-[#dc262640] shadow-[0_0_16px_#dc262615] -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className={mode === m.id ? "text-[#dc2626]" : "text-[#52525b]"}>{m.icon}</span>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-[11px] tracking-wide whitespace-nowrap">{m.label}</span>
              <span className="text-[9px] opacity-60 hidden sm:block whitespace-nowrap">{m.desc}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Password DNA Bar ── */
function PasswordDNA({ segments }: { segments: DNASegment[] }) {
  if (segments.length === 0) return null;

  const strengthColors = [
    "#dc2626", // 0 - very weak (red)
    "#f59e0b", // 1 - weak (amber)
    "#3b82f6", // 2 - moderate (blue)
    "#10b981", // 3 - strong (green)
  ];

  const strengthLabels = ["Very Weak", "Weak", "Moderate", "Strong"];

  return (
    <div className="w-full max-w-lg mx-auto mt-4">
      <details className="group bg-[#111114]/80 backdrop-blur-sm border border-[#1e1e24] rounded-2xl gradient-border hover-lift" open>
        <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#18181c] rounded-2xl transition-colors duration-200">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
              <path d="M2 12h4l3-9 4 18 3-9h6" />
            </svg>
            <span className="text-sm font-semibold text-[#e8e8ea]">Password DNA</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" className="group-open:rotate-180 transition-transform duration-300">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="px-4 pb-4 pt-1 border-t border-[#1e1e24]">
          {/* DNA Bar */}
          <div className="flex gap-0.5 mt-3 rounded-lg overflow-hidden h-8">
            {segments.map((seg, i) => (
              <motion.div
                key={i}
                className="flex-1 flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-300 hover:flex-[2] cursor-default group/seg relative"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                style={{ backgroundColor: `${strengthColors[seg.strength]}25`, borderBottom: `3px solid ${strengthColors[seg.strength]}`, transformOrigin: "bottom" }}
                title={`"${seg.char}" — ${strengthLabels[seg.strength]}: ${seg.reason}`}
              >
                <span style={{ color: strengthColors[seg.strength] }}>{seg.char}</span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/seg:block z-20 pointer-events-none">
                  <div className="bg-[#0c0c0f] border border-[#2a2a32] rounded-lg px-2.5 py-1.5 text-[9px] whitespace-nowrap shadow-xl">
                    <span style={{ color: strengthColors[seg.strength] }}>{strengthLabels[seg.strength]}</span>
                    <div className="text-[#71717a] mt-0.5">{seg.reason}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3">
            {strengthLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: strengthColors[i] }} />
                <span className="text-[9px] text-[#71717a]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

/* ── AI engine status badge (transparency: free, no-signup, offline-capable) ── */
function AIEngineBadge({ engine, streaming }: { engine: "pollinations" | "local" | null; streaming: boolean }) {
  const isAI = engine === "pollinations";
  const label = streaming && !engine
    ? "Composing…"
    : isAI
    ? "Written by Pollinations AI"
    : "Written by the local engine";
  const color = streaming && !engine ? "#71717a" : isAI ? "#10b981" : "#f59e0b";

  return (
    <div className="flex items-center justify-center mb-3">
      <span
        className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border backdrop-blur-sm"
        style={{ color, borderColor: `${color}35`, backgroundColor: `${color}0d` }}
        title="Free & open — no API key, no account, no cost. Falls back to a fully local engine when offline."
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
        {label}
      </span>
    </div>
  );
}

/* ── Live network-transparency proof (shows exactly what was sent) ── */
function NetworkTransparency({ hashPrefix, failed }: { hashPrefix?: string; failed?: boolean }) {
  if (failed) {
    return (
      <motion.div
        className="w-full max-w-lg mx-auto mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start gap-2.5 rounded-xl border border-[#f59e0b25] bg-[#f59e0b08] px-3.5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-[11px] text-[#c9a25a] leading-relaxed">
            The breach database couldn&apos;t be reached, so the breach count is unavailable — but your strength analysis ran <strong className="text-[#f59e0b]">fully offline on your device</strong>. Your password was never sent anywhere.
          </span>
        </div>
      </motion.div>
    );
  }

  if (!hashPrefix) return null;

  return (
    <motion.div
      className="w-full max-w-lg mx-auto mt-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-xl border border-[#10b98122] bg-[#0a120f]/70 px-3.5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#10b981]">Verified: what left your device</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-[#8a9a92]">Only this hash prefix was sent to HIBP:</span>
          <code className="text-[12px] font-mono font-bold tracking-wider text-[#10b981] bg-[#10b98110] border border-[#10b98125] rounded-md px-2 py-0.5">
            {hashPrefix}<span className="text-[#3f6b58]">••••••••••••••••••••••••••••••••••••</span>
          </code>
        </div>
        <p className="text-[10px] text-[#6b8a7a] mt-2 leading-relaxed">
          Your password and the remaining 35 characters of its hash never left this browser. Watch it yourself in DevTools → Network.
        </p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [obituary, setObituary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [passwordAlive, setPasswordAlive] = useState(false);
  const [error, setError] = useState("");
  const [graveyard, setGraveyard] = useState<GraveyardEntry[]>([]);
  const [totalChecked, setTotalChecked] = useState(0);
  const [tone, setTone] = useState<ToneOption>("victorian");
  const [lastPassword, setLastPassword] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [mode, setMode] = useState<AppMode>("single");
  const [aiEngine, setAiEngine] = useState<"pollinations" | "local" | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  /** Get or create a shared AudioContext (avoids browser cap of ~6 contexts) */
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    // Resume if suspended (browsers suspend until user gesture)
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Close AudioContext on unmount
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  // Dynamic session stats
  const deadCount = graveyard.filter((e) => !e.alive).length;
  const aliveCount = graveyard.filter((e) => e.alive).length;
  const avgScore = graveyard.length > 0 ? Math.round(graveyard.reduce((s, e) => s + e.score, 0) / graveyard.length) : 0;
  const lastScore = analysisData?.characteristics.strengthScore ?? null;

  // Contextual security tips based on last analysis
  const dynamicTips = useMemo(() => {
    const base = [
      "Use a password manager for unique passwords on every site",
      "Enable two-factor authentication wherever possible",
      "A 16+ character passphrase beats a complex 8-char password",
      "Never reuse passwords across different accounts",
    ];
    if (!analysisData) return base;
    const c = analysisData.characteristics;
    const tips: string[] = [];
    if (!c.hasUppercase) tips.push("Add uppercase letters to increase entropy");
    if (!c.hasNumbers) tips.push("Including numbers strengthens your password significantly");
    if (!c.hasSymbols) tips.push("Special characters like @#$% make passwords much harder to crack");
    if (c.length < 12) tips.push("Aim for 12+ characters — length is your best defense");
    if (c.isCommon) tips.push("Your password appeared in common password lists — change it immediately");
    if (c.hasKeyboardPattern) tips.push("Keyboard patterns like 'qwerty' are the first thing attackers try");
    if (c.hasRepeatingChars) tips.push("Repeating characters weaken your password — diversify your choices");
    if (c.hasSequentialNumbers) tips.push("Sequential numbers like '123' are trivially guessable");
    if (analysisData.breachCount > 0) tips.push(`This password appeared in ${analysisData.breachCount.toLocaleString()} breaches — retire it now`);
    return tips.length > 0 ? tips : base;
  }, [analysisData]);

  /** Funeral bell — low, somber tone */
  const playDeathBell = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(554, ctx.currentTime);
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.08, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 1.8);
    } catch {
      // Audio not available
    }
  }, [getAudioContext]);

  /** Victory chime — bright ascending arpeggio */
  const playVictoryChime = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.type = "triangle";
        const start = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
        osc.start(start);
        osc.stop(start + 0.6);
      });
    } catch {
      // Audio not available
    }
  }, [getAudioContext]);

  const handleSubmit = useCallback(
    async (password: string) => {
      setIsLoading(true);
      setObituary("");
      setError("");
      setAnalysisData(null);
      setPasswordAlive(false);
      setIsStreaming(true);
      setLastPassword(password);
      setAiEngine(null);

      try {
        // ── Everything below runs IN THE BROWSER. The raw password is never
        // sent to our server; only a 5-char SHA-1 prefix goes to HIBP. ──

        // 1. Local strength analysis + masking + DNA (no network at all)
        const characteristics = analyzePassword(password);
        const maskedPassword = maskPassword(password);
        const dnaSegments = analyzePasswordDNA(password);

        // 2. Breach check via HIBP k-anonymity, directly from the browser
        let breachCount = 0;
        let hashPrefix = "";
        let breachCheckFailed = false;
        try {
          const breach = await checkPasswordBreach(password);
          breachCount = breach.breachCount;
          hashPrefix = breach.hashPrefix;
        } catch {
          breachCheckFailed = true; // network/CORS issue — analysis still valid
        }

        setAnalysisData({ breachCount, characteristics, maskedPassword, dnaSegments, hashPrefix, breachCheckFailed });
        setTotalChecked((c) => c + 1);

        const alive = characteristics.strengthScore >= 80 && breachCount === 0;

        // Add to graveyard
        setGraveyard((prev) => [
          {
            maskedPassword,
            score: characteristics.strengthScore,
            alive,
            timestamp: Date.now(),
          },
          ...prev.slice(0, 19), // keep last 20
        ]);

        if (alive) {
          setPasswordAlive(true);
          setIsStreaming(false);
          playVictoryChime();
          return;
        }

        playDeathBell();

        // Trigger skull confetti on death
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);

        // Stream the obituary from our own route (Pollinations AI → local fallback)
        await streamObituary(
          { tone, characteristics, breachCount },
          (text) => setObituary(text),
          (engine) => setAiEngine(engine)
        );

        setIsStreaming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setIsStreaming(false);
      } finally {
        setIsLoading(false);
      }
    },
    [playDeathBell, playVictoryChime, tone]
  );

  return (
    <main className={`min-h-screen flex flex-col items-center px-4 py-16 md:py-24 overflow-hidden ${analysisData ? "pb-16" : ""}`}>
      {/* Animated canvas background */}
      <AnimatedBackground />

      {/* Skull Confetti on password death */}
      <SkullConfetti active={showConfetti} duration={4000} />

      {/* Floating particles background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
        <div className="particle particle-5" />
        <div className="particle particle-6" />
        <div className="particle particle-7" />
      </div>

      {/* Vignette overlay */}
      <div className="fixed inset-0 pointer-events-none vignette-overlay" aria-hidden="true" />

      {/* Live Threat Level Indicator */}
      <AnimatePresence>
        {lastScore !== null && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-50 h-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="h-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: lastScore >= 80
                  ? "linear-gradient(90deg, #10b981, #34d399, #10b981)"
                  : lastScore >= 50
                  ? "linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)"
                  : "linear-gradient(90deg, #dc2626, #ef4444, #dc2626)",
                boxShadow: lastScore >= 80
                  ? "0 0 12px #10b98180"
                  : lastScore >= 50
                  ? "0 0 12px #f59e0b80"
                  : "0 0 12px #dc262680",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        className="text-center mb-12 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-center gap-4 mb-5">
          <LogoSVG />
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#e8e8ea] leading-tight">
              Dead<span className="animate-text-shimmer">Credentials</span>
            </h1>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#dc262640] to-transparent mt-1.5" />
          </div>
        </div>
        <div className="h-6 flex items-center justify-center">
          <TypewriterText
            texts={[
              "Every password has a story. Most end tragically.",
              "Is your password dead or alive?",
              "The obituary your password deserves.",
              "Check if your password survived the breach apocalypse.",
              "Where weak passwords go to meet their fate.",
            ]}
          />
        </div>

        {/* Live counter + session stats */}
        <AnimatePresence>
          {totalChecked > 0 && (
            <motion.div
              className="mt-3.5 flex flex-col items-center gap-2"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] text-[#71717a] uppercase tracking-widest font-mono bg-[#111114]/60 border border-[#1e1e24] px-3 py-1 rounded-full backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
                {totalChecked} password{totalChecked !== 1 ? "s" : ""} checked
              </span>
              {graveyard.length > 0 && (
                <motion.div
                  className="flex items-center gap-3 text-[9px] font-mono tracking-wider"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="flex items-center gap-1 text-[#dc2626]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg>
                    {deadCount} dead
                  </span>
                  <span className="text-[#27272a]">|</span>
                  <span className="flex items-center gap-1 text-[#10b981]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    {aliveCount} alive
                  </span>
                  <span className="text-[#27272a]">|</span>
                  <span className="text-[#71717a]">avg: {avgScore}/100</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Trust & privacy — how we prove your password never leaves your device */}
      <div className="relative z-10 w-full">
        <TrustPanel />
      </div>

      {/* Mode Switcher */}
      <div className="relative z-10 w-full">
        <ModeSwitcher mode={mode} setMode={setMode} />
      </div>

      {/* Single Mode Content */}
      <AnimatePresence mode="wait">
        {mode === "single" && (
          <motion.div
            key="single-mode"
            className="w-full flex flex-col items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Tone Selector */}
            <div className="w-full">
              <ToneSelector tone={tone} setTone={setTone} />
            </div>

            {/* Password Input */}
            <motion.div
              className="w-full mt-5"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <PasswordInput
                onSubmit={handleSubmit}
                isLoading={isLoading}
                hasResults={!!analysisData}
                onReset={() => {
                  setObituary("");
                  setAnalysisData(null);
                  setPasswordAlive(false);
                  setError("");
                  setIsStreaming(false);
                  setShowConfetti(false);
                  setLastPassword("");
                  setAiEngine(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Mode Content */}
      <AnimatePresence mode="wait">
        {mode === "batch" && (
          <motion.div
            key="batch-mode"
            className="relative z-10 w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <BatchProcessor visible={true} tone={tone} setTone={setTone} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generator Mode Content */}
      <AnimatePresence mode="wait">
        {mode === "generator" && (
          <motion.div
            key="generator-mode"
            className="relative z-10 w-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <PasswordGenerator />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-5 max-w-lg w-full mx-auto p-3.5 bg-[#dc262608] border border-[#dc262625] rounded-2xl text-sm text-[#dc2626] text-center relative z-10"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section - staggered reveal (single mode only) */}
      <AnimatePresence>
        {mode === "single" && analysisData && (
          <motion.div
            className="w-full flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            aria-live="polite"
            aria-label="Password analysis results"
          >
            {/* Network transparency proof — exactly what left the device */}
            <NetworkTransparency
              hashPrefix={analysisData.hashPrefix}
              failed={analysisData.breachCheckFailed}
            />

            {/* Strength Meter */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <StrengthMeter
                score={analysisData.characteristics.strengthScore}
                crackTime={analysisData.characteristics.estimatedCrackTime}
                entropyBits={analysisData.characteristics.entropyBits}
                visible={true}
              />
            </motion.div>

            {/* Fun Comparison */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <FunComparison
                score={analysisData.characteristics.strengthScore}
                crackTime={analysisData.characteristics.estimatedCrackTime}
              />
            </motion.div>

            {/* Password DNA */}
            {analysisData.dnaSegments && (
              <motion.div
                className="w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
              >
                <PasswordDNA segments={analysisData.dnaSegments} />
              </motion.div>
            )}

            {/* Crack Time Visualizer */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <CrackTimeVisualizer
                crackTime={analysisData.characteristics.estimatedCrackTime}
                score={analysisData.characteristics.strengthScore}
                visible={true}
              />
            </motion.div>

            {/* Threat Actor Profile */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <ThreatActorProfile
                score={analysisData.characteristics.strengthScore}
                breachCount={analysisData.breachCount}
                visible={true}
              />
            </motion.div>

            {/* Security Breakdown */}
            <motion.div
              className="w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
            >
              <BreakdownPanel characteristics={analysisData.characteristics} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Survival Card (for alive passwords) */}
      <AnimatePresence>
        {mode === "single" && passwordAlive && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <SurvivalCard
              maskedPassword={analysisData?.maskedPassword ?? ""}
              score={analysisData?.characteristics.strengthScore ?? 0}
              crackTime={analysisData?.characteristics.estimatedCrackTime ?? "unknown"}
              visible={passwordAlive}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Obituary Card (for dead passwords) */}
      <AnimatePresence>
        {mode === "single" && !passwordAlive && (obituary || isStreaming) && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <div className="w-full max-w-2xl mx-auto">
              <AIEngineBadge engine={aiEngine} streaming={isStreaming} />
            </div>
            <ObituaryCard
              obituary={obituary}
              breachCount={analysisData?.breachCount ?? 0}
              deathCause={analysisData?.characteristics.deathCause ?? "unknown"}
              maskedPassword={analysisData?.maskedPassword ?? ""}
              isStreaming={isStreaming}
              score={analysisData?.characteristics.strengthScore ?? 0}
              tone={tone}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Reincarnation (for dead passwords, after obituary is done) */}
      <AnimatePresence>
        {mode === "single" && !passwordAlive && analysisData && !isStreaming && obituary && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ReincarnationBox
              password={lastPassword}
              characteristics={analysisData.characteristics}
              visible={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Graveyard */}
      <AnimatePresence>
        {mode === "single" && graveyard.length > 0 && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <PasswordGraveyard entries={graveyard} onClear={() => { setGraveyard([]); setTotalChecked(0); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Tips Ticker */}
      <AnimatePresence>
        {mode === "single" && analysisData && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-[#0c0c0f]/90 backdrop-blur-md border-t border-[#1e1e24] py-2">
              <div className="ticker-scroll flex items-center gap-8 whitespace-nowrap">
                {[...dynamicTips, ...dynamicTips].map((tip, i) => (
                  <span key={i} className="inline-flex items-center gap-2 text-[10px] font-mono text-[#52525b] tracking-wide">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc262660" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    {tip}
                    <span className="text-[#dc262630] mx-2">{"///"}</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer
        className="mt-20 mb-12 text-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="h-px w-40 mx-auto bg-gradient-to-r from-transparent via-[#dc262640] to-transparent mb-6" />
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-[11px] text-[#71717a] tracking-wide px-4">
          <span>Built with</span>
          <span className="text-[#dc2626]">&#9829;</span>
          <span>using Next.js</span>
          <span className="text-[#dc262660]">&bull;</span>
          <span>Powered by HIBP &amp; Pollinations AI</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10b98108] border border-[#10b98120] text-[#10b981]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            100% Free
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#dc262608] border border-[#dc262620] text-[#a1a1aa]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            No Sign-up
          </span>
          <a
            href="https://github.com/suryanarayanrenjith/DeadCredentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111114] border border-[#1e1e24] text-[#a1a1aa] hover:text-[#e8e8ea] hover:border-[#2a2a34] transition-colors duration-200"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" /></svg>
            Open Source
          </a>
        </div>
        {graveyard.length > 0 && (
          <motion.div
            className="mt-4 flex items-center justify-center gap-4 text-[9px] font-mono text-[#3f3f46] tracking-wider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span>SESSION: {totalChecked} analyzed</span>
            <span className="text-[#27272a]">|</span>
            <span>MORTALITY: {totalChecked > 0 ? Math.round((deadCount / totalChecked) * 100) : 0}%</span>
            <span className="text-[#27272a]">|</span>
            <span>AVG STRENGTH: {avgScore}/100</span>
          </motion.div>
        )}
      </motion.footer>
    </main>
  );
}
