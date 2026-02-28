"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface SurvivalCardProps {
  maskedPassword: string;
  score: number;
  crackTime: string;
  visible: boolean;
}

export default function SurvivalCard({
  maskedPassword,
  score,
  crackTime,
  visible,
}: SurvivalCardProps) {
  const [shareState, setShareState] = useState<"idle" | "capturing" | "done">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  if (!visible) return null;

  const handleShare = async () => {
    if (!cardRef.current || shareState === "capturing") return;
    setShareState("capturing");

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: "#08080a",
        pixelRatio: 2,
        quality: 1.0,
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `deadcredentials-survivor.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareState("done");
      setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("idle");
    }
  };

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto mt-8"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div ref={cardRef}>
        {/* No breach banner */}
        <motion.div
          className="mb-5 flex items-center justify-center gap-3 py-3.5 px-5 bg-[#10b98110] border border-[#10b98130] rounded-2xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#10b98120] animate-pulse-glow-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <span className="text-[#10b981] font-semibold text-sm">
            Not found in any known data breaches
          </span>
        </motion.div>

        {/* Shield SVG */}
        <motion.div
          className="flex flex-col items-center mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <ShieldSVG />
        </motion.div>

        {/* Survival Certificate */}
        <div className="survival-card rounded-2xl p-8 md:p-10 gradient-border-green">
          {/* Header */}
          <div className="text-center mb-6 pb-5 border-b border-[#10b98120]">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#10b98135]" />
              <span className="text-[10px] tracking-[0.4em] uppercase text-[#10b981] font-medium opacity-70">
                Certificate of Survival
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#10b98135]" />
            </div>
            <div className="text-[10px] text-[#71717a] italic font-serif">
              &quot;Against all odds, this one lives&quot;
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-[#10b981] font-serif tracking-wide animate-text-shimmer-green">
              🛡️ STILL STANDING: {maskedPassword}
            </h2>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#10b98108] border border-[#10b98120] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold font-mono text-[#10b981]">{score}/100</div>
              <div className="text-[10px] text-[#71717a] uppercase tracking-wider mt-1">Strength Score</div>
            </div>
            <div className="bg-[#10b98108] border border-[#10b98120] rounded-xl p-4 text-center">
              <div className="text-lg font-bold font-mono text-[#10b981]">{crackTime}</div>
              <div className="text-[10px] text-[#71717a] uppercase tracking-wider mt-1">To Crack</div>
            </div>
          </div>

          {/* Message */}
          <div className="font-serif text-[0.9rem] leading-[1.8] text-[#b8b8c0] space-y-4">
            <p>
              Against all expectations in this digital wasteland of <span className="text-[#10b981] font-semibold">&quot;password123&quot;</span> and <span className="text-[#10b981] font-semibold">&quot;qwerty&quot;</span>, the password <span className="text-[#10b981] font-semibold">&quot;{maskedPassword}&quot;</span> stands defiant.
            </p>
            <p>
              With a strength score of <span className="text-[#e8e8ea] font-bold">{score}/100</span> and an estimated crack time of <span className="text-[#e8e8ea] font-bold">{crackTime}</span>, this password has earned its place among the living. It has not been found in any known data breach — a rare achievement in our compromised world.
            </p>
            <p className="text-[#71717a] italic">
              This password lives to authenticate another day. But remember — even the strongest passwords benefit from two-factor authentication and a good password manager.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-5 border-t border-[#10b98120]">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] text-[#71717a] italic font-serif flex items-center gap-1.5">
                <span className="text-[#10b98180]">✦</span>
                Long may it protect
                <span className="text-[#10b98180]">✦</span>
              </div>
            </div>

            <button
              onClick={handleShare}
              disabled={shareState === "capturing"}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer disabled:opacity-50 shadow-[0_0_20px_#10b98125] hover:shadow-[0_0_30px_#10b98140]"
            >
              {shareState === "capturing" ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Capturing...
                </>
              ) : shareState === "done" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Image Saved!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Share Survival Certificate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Watermark */}
        <div className="mt-3 text-center">
          <span className="text-[10px] text-[#52525b] tracking-widest uppercase font-medium">
            🛡️ DeadCredentials
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ShieldSVG() {
  return (
    <svg width="72" height="88" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_20px_rgba(16,185,129,0.2)]">
      {/* Shield body */}
      <path
        d="M40 8 L68 22 L68 52 C68 72 54 88 40 94 C26 88 12 72 12 52 L12 22 Z"
        fill="#0f1f1a"
        stroke="#10b981"
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* Inner shield */}
      <path
        d="M40 16 L60 27 L60 50 C60 66 50 78 40 83 C30 78 20 66 20 50 L20 27 Z"
        fill="#10b98108"
        stroke="#10b98140"
        strokeWidth="1"
      />
      {/* Checkmark */}
      <polyline
        points="28 50 36 58 52 42"
        stroke="#10b981"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shield-check"
      />
      {/* Sparkles */}
      <circle cx="22" cy="35" r="1.5" fill="#10b981" opacity="0.4" className="sparkle-1" />
      <circle cx="58" cy="35" r="1.5" fill="#10b981" opacity="0.4" className="sparkle-2" />
      <circle cx="40" cy="18" r="1" fill="#10b981" opacity="0.3" className="sparkle-3" />
    </svg>
  );
}
