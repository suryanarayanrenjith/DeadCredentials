"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PasswordCharacteristics } from "@/lib/passwordAnalyzer";
import { analyzePassword } from "@/lib/passwordAnalyzer";
import { ensurePuterReady } from "@/lib/puterAuth";

// Puter global type is declared in lib/puterAuth.ts

// ── Theme detection ──
const ANIMAL_WORDS = new Set([
  "cat", "dog", "fish", "bear", "wolf", "lion", "tiger", "eagle", "hawk",
  "shark", "snake", "panda", "fox", "deer", "horse", "monkey", "dragon",
  "rabbit", "turtle", "mouse", "rat", "bat", "bird", "duck", "owl",
  "whale", "dolphin", "kitten", "puppy", "bunny", "chicken", "penguin",
]);

const COLOR_WORDS = new Set([
  "red", "blue", "green", "black", "white", "gold", "silver", "purple",
  "pink", "orange", "yellow", "gray", "grey", "brown", "crimson", "azure",
  "violet", "indigo", "scarlet", "emerald", "ruby", "jade", "amber",
]);

const SPORT_WORDS = new Set([
  "soccer", "football", "baseball", "basket", "tennis", "golf", "hockey",
  "boxing", "rugby", "cricket", "racing", "swim", "surf", "skate",
  "ski", "climb", "run", "ball", "goal", "score", "team", "win",
]);

const NAME_PATTERNS = /^[A-Z][a-z]{2,}/;

function detectTheme(password: string): string {
  const lower = password.toLowerCase().replace(/[0-9!@#$%^&*_\-+=?]/g, "");

  for (const word of ANIMAL_WORDS) {
    if (lower.includes(word)) return `animal (${word})`;
  }
  for (const word of COLOR_WORDS) {
    if (lower.includes(word)) return `color (${word})`;
  }
  for (const word of SPORT_WORDS) {
    if (lower.includes(word)) return `sport (${word})`;
  }
  if (NAME_PATTERNS.test(password)) {
    const match = password.match(/^[A-Za-z]+/);
    if (match && match[0].length >= 3) return `name/word (${match[0].toLowerCase()})`;
  }
  if (/^\d+$/.test(password)) return "numbers only";
  if (/^[a-z]+$/i.test(password)) return "letters only";

  return "mixed/random";
}

// ── Phoenix SVG ──
function PhoenixSVG({ animate }: { animate: boolean }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animate ? "phoenix-glow" : ""}
    >
      {/* Body */}
      <path
        d="M32 52C32 52 20 42 20 30C20 22 25 16 32 14C39 16 44 22 44 30C44 42 32 52 32 52Z"
        fill="#f59e0b"
        opacity="0.9"
      />
      {/* Wings */}
      <path
        d="M20 30C20 30 10 24 6 16C12 20 18 22 20 26"
        stroke="#dc2626"
        strokeWidth="2"
        fill="#dc262640"
        strokeLinecap="round"
      />
      <path
        d="M44 30C44 30 54 24 58 16C52 20 46 22 44 26"
        stroke="#dc2626"
        strokeWidth="2"
        fill="#dc262640"
        strokeLinecap="round"
      />
      {/* Head */}
      <circle cx="32" cy="18" r="5" fill="#f59e0b" />
      <circle cx="30.5" cy="17" r="1" fill="#0f0d0a" />
      <circle cx="33.5" cy="17" r="1" fill="#0f0d0a" />
      {/* Beak */}
      <path d="M32 20L30 22L32 23L34 22L32 20Z" fill="#dc2626" />
      {/* Tail feathers */}
      <path d="M32 52C32 52 28 56 24 60" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
      <path d="M32 52C32 52 32 58 32 62" stroke="#dc2626" strokeWidth="1.5" opacity="0.6" />
      <path d="M32 52C32 52 36 56 40 60" stroke="#f59e0b" strokeWidth="1.5" opacity="0.6" />
      {/* Inner flame */}
      <path
        d="M32 44C32 44 26 36 26 30C26 26 28 22 32 20C36 22 38 26 38 30C38 36 32 44 32 44Z"
        fill="#fbbf24"
        opacity="0.5"
      />
    </svg>
  );
}

interface ReincarnationBoxProps {
  password: string;
  characteristics: PasswordCharacteristics;
  visible: boolean;
}

export default function ReincarnationBox({
  password,
  characteristics,
  visible,
}: ReincarnationBoxProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [explanation, setExplanation] = useState("");
  const [newScore, setNewScore] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);

  const theme = detectTheme(password);

  const handleReincarnate = useCallback(async () => {
    setIsGenerating(true);
    setError("");
    setNewPassword("");
    setExplanation("");
    setNewScore(null);
    setShowResult(false);

    try {
      // 1. Get prompts from API
      const response = await fetch("/api/reincarnate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          length: characteristics.length,
          characteristics: {
            hasUppercase: characteristics.hasUppercase,
            hasNumbers: characteristics.hasNumbers,
            hasSymbols: characteristics.hasSymbols,
            isCommon: characteristics.isCommon,
            hasKeyboardPattern: characteristics.hasKeyboardPattern,
            hasRepeatingChars: characteristics.hasRepeatingChars,
            length: characteristics.length,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to get reincarnation prompt");

      const { systemPrompt, userPrompt } = await response.json();

      // 2. Use Puter.js to generate (non-streaming for JSON parsing)
      await ensurePuterReady();

      const result = await puter!.ai.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          model: "gemini-2.0-flash",
          stream: false,
          temperature: 0.9,
        }
      );

      // Handle non-streaming response
      let rawText = "";
      if (result && typeof result === "object" && "message" in result) {
        rawText = (result as { message?: { content?: string } }).message?.content || "";
      } else if (typeof result === "string") {
        rawText = result;
      }

      // Parse JSON response — handle markdown code blocks
      let cleaned = rawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }

      const parsed = JSON.parse(cleaned);
      const generatedPw = parsed.password || "";
      const generatedExplanation = parsed.explanation || "";

      if (!generatedPw) throw new Error("No password generated");

      // 3. Score the new password
      const newAnalysis = analyzePassword(generatedPw);

      setNewPassword(generatedPw);
      setExplanation(generatedExplanation);
      setNewScore(newAnalysis.strengthScore);
      setShowResult(true);
    } catch (err) {
      console.error("Reincarnation error:", err);
      setError(err instanceof Error ? err.message : "Failed to reincarnate password");
    } finally {
      setIsGenerating(false);
    }
  }, [theme, characteristics]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = newPassword;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [newPassword]);

  if (!visible) return null;

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto mt-8 relative z-10"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="reincarnation-card rounded-2xl p-6 gradient-border">
        {/* Header */}
        <motion.div
          className="flex items-center gap-3 mb-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <PhoenixSVG animate={showResult} />
          <div>
            <h3 className="text-lg font-bold text-[#f59e0b] tracking-wide" style={{ fontFamily: "var(--font-obituary)" }}>
              Password Reincarnation
            </h3>
            <p className="text-[11px] text-[#8b7a4a]">
              From the ashes, a stronger password rises
            </p>
          </div>
        </motion.div>

        {/* Theme detection display */}
        <motion.div
          className="mb-4 flex items-center gap-2 text-xs"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <span className="text-[#71717a]">Detected theme:</span>
          <span className="px-2.5 py-1 rounded-full bg-[#f59e0b10] border border-[#f59e0b25] text-[#f59e0b] font-medium">
            {theme}
          </span>
        </motion.div>

        {/* Generate button */}
        <AnimatePresence>
        {!showResult && (
          <motion.button
            onClick={handleReincarnate}
            disabled={isGenerating}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer
              bg-gradient-to-r from-[#f59e0b] to-[#dc2626] text-white
              hover:from-[#fbbf24] hover:to-[#ef4444]
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-[0_0_20px_#f59e0b20]"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Forging new password...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>🔥</span>
                Reincarnate This Password
              </span>
            )}
          </motion.button>
        )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
        {error && (
          <motion.div
            className="mt-3 p-3 bg-[#dc262608] border border-[#dc262625] rounded-xl text-sm text-[#dc2626] text-center"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.div>
        )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
        {showResult && newPassword && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* New password display */}
            <div className="bg-[#0c0a06] border border-[#f59e0b25] rounded-xl p-4 mb-3">
              <div className="text-[10px] uppercase tracking-widest text-[#8b7a4a] mb-2 font-mono">
                Reborn Password
              </div>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-lg font-mono font-bold text-[#fbbf24] tracking-wider break-all select-all">
                  {newPassword}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-2 rounded-lg bg-[#f59e0b15] border border-[#f59e0b30] hover:bg-[#f59e0b25] transition-colors duration-200 cursor-pointer"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
              </div>
              {copied && (
                <div className="mt-2 text-[11px] text-[#10b981] animate-fade-in-up">
                  ✓ Copied to clipboard!
                </div>
              )}
            </div>

            {/* Explanation */}
            {explanation && (
              <div className="text-[11px] text-[#a89878] italic mb-3 px-1" style={{ fontFamily: "var(--font-obituary)" }}>
                &ldquo;{explanation}&rdquo;
              </div>
            )}

            {/* Strength score */}
            {newScore !== null && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-2 rounded-full bg-[#1e1e24] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${newScore}%`,
                      backgroundColor: newScore >= 80 ? "#10b981" : newScore >= 60 ? "#f59e0b" : "#dc2626",
                    }}
                  />
                </div>
                <span
                  className="text-sm font-mono font-bold min-w-[40px] text-right"
                  style={{
                    color: newScore >= 80 ? "#10b981" : newScore >= 60 ? "#f59e0b" : "#dc2626",
                  }}
                >
                  {newScore}/100
                </span>
              </div>
            )}

            {/* Score badge */}
            {newScore !== null && (
              <div
                className={`text-center py-2 px-4 rounded-lg text-xs font-semibold ${
                  newScore >= 80
                    ? "bg-[#10b98115] border border-[#10b98130] text-[#10b981]"
                    : newScore >= 60
                    ? "bg-[#f59e0b15] border border-[#f59e0b30] text-[#f59e0b]"
                    : "bg-[#dc262615] border border-[#dc262630] text-[#dc2626]"
                }`}
              >
                {newScore >= 80
                  ? "✨ Strong enough to survive! This password lives!"
                  : newScore >= 60
                  ? "⚠️ Getting there, but could be stronger..."
                  : "💀 Still weak... try again for a stronger reincarnation"}
              </div>
            )}

            {/* Phoenix embers decoration */}
            <div className="relative h-8 mt-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`absolute w-1.5 h-1.5 rounded-full bg-[#f59e0b] phoenix-ember phoenix-ember-${i}`}
                  style={{ left: `${15 + i * 15}%`, bottom: 0 }}
                />
              ))}
            </div>

            {/* Try again button */}
            <button
              onClick={() => {
                setShowResult(false);
                setNewPassword("");
                setExplanation("");
                setNewScore(null);
              }}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-medium text-[#8b7a4a] border border-[#f59e0b15] hover:border-[#f59e0b30] hover:text-[#f59e0b] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Try another reincarnation
            </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
