"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generatePassword, generatePassphrase } from "@/lib/generator";
import { analyzePassword } from "@/lib/passwordAnalyzer";

type GenMode = "random" | "passphrase";

const SEPARATORS: { value: string; label: string }[] = [
  { value: "-", label: "hyphen" },
  { value: ".", label: "dot" },
  { value: "_", label: "underscore" },
  { value: "", label: "none" },
];

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer ${
        checked
          ? "bg-[#dc262612] border-[#dc262640] text-[#e8e8ea]"
          : "bg-[#111114] border-[#1e1e24] text-[#71717a] hover:border-[#2a2a34]"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span>{label}</span>
      <span
        className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-[#dc2626]" : "bg-[#27272a]"
        }`}
      >
        <span
          className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-200"
          style={{ left: checked ? "16px" : "2px" }}
        />
      </span>
    </button>
  );
}

export default function PasswordGenerator() {
  const [mode, setMode] = useState<GenMode>("random");
  const [nonce, setNonce] = useState(0); // bump to force a fresh generation
  const [copied, setCopied] = useState(false);

  // Random options
  const [length, setLength] = useState(20);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);

  // Passphrase options
  const [words, setWords] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(true);
  const [includeNumber, setIncludeNumber] = useState(true);

  // Derive the password from the current options (and a regenerate nonce)
  // via useMemo — no effects, no cascading renders. Non-determinism is
  // intentional and re-runs only when a dependency changes.
  const password = useMemo(() => {
    if (mode === "random") {
      const anySelected = upper || lower || numbers || symbols;
      return generatePassword({
        length,
        uppercase: upper,
        lowercase: anySelected ? lower : true,
        numbers,
        symbols,
      });
    }
    return generatePassphrase({ words, separator, capitalize, includeNumber });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, length, upper, lower, numbers, symbols, words, separator, capitalize, includeNumber, nonce]);

  const generate = useCallback(() => setNonce((n) => n + 1), []);

  const analysis = useMemo(() => (password ? analyzePassword(password) : null), [password]);

  const handleCopy = useCallback(async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = password;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [password]);

  const score = analysis?.strengthScore ?? 0;
  const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#84cc16" : score >= 40 ? "#f59e0b" : "#dc2626";
  const scoreLabel = score >= 80 ? "Very Strong" : score >= 60 ? "Strong" : score >= 40 ? "Moderate" : "Weak";

  return (
    <motion.div
      className="w-full max-w-lg mx-auto mt-6 relative z-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-[#0c0c0f]/80 backdrop-blur-sm border border-[#1e1e24] rounded-2xl p-6 gradient-border">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <h3 className="text-sm font-semibold text-[#e8e8ea] tracking-wide">Strong Password Forge</h3>
          <span className="text-[9px] text-[#52525b] ml-auto font-mono uppercase tracking-wider">Local · Secure RNG</span>
        </div>

        {/* Generated password display */}
        <div className="bg-[#0a0a0d] border border-[#1e1e24] rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <code className="flex-1 text-base md:text-lg font-mono font-bold text-[#e8e8ea] tracking-wide break-all select-all leading-relaxed">
              {password || "…"}
            </code>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={generate}
                className="p-2 rounded-lg bg-[#dc262615] border border-[#dc262630] hover:bg-[#dc262625] transition-colors duration-200 cursor-pointer"
                title="Regenerate"
                aria-label="Regenerate password"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-[#111114] border border-[#27272a] hover:border-[#3a3a42] transition-colors duration-200 cursor-pointer"
                title="Copy to clipboard"
                aria-label="Copy password"
              >
                {copied ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Strength + entropy */}
          {analysis && (
            <div className="mt-3.5 pt-3.5 border-t border-[#1e1e24]">
              <div className="flex items-center justify-between text-[10px] mb-1.5">
                <span className="font-semibold uppercase tracking-wider" style={{ color: scoreColor }}>{scoreLabel}</span>
                <span className="font-mono text-[#71717a]">
                  {analysis.entropyBits ?? 0} bits · {score}/100
                </span>
              </div>
              <div className="h-2 bg-[#1e1e24] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ backgroundColor: scoreColor, boxShadow: `0 0 10px ${scoreColor}50` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mode switch */}
        <div className="flex gap-1.5 p-1 bg-[#0c0c0f]/60 border border-[#1e1e24] rounded-xl mb-4">
          {([
            { id: "random", label: "Random", desc: "Maximum entropy" },
            { id: "passphrase", label: "Passphrase", desc: "Easy to remember" },
          ] as { id: GenMode; label: string; desc: string }[]).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`relative flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors duration-200 cursor-pointer ${
                mode === m.id ? "text-[#e8e8ea]" : "text-[#71717a] hover:text-[#a1a1aa]"
              }`}
            >
              {mode === m.id && (
                <motion.div
                  layoutId="gen-pill"
                  className="absolute inset-0 rounded-lg bg-[#dc262612] border border-[#dc262640] -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <div className="font-semibold text-[11px]">{m.label}</div>
              <div className="text-[8px] opacity-60">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Options */}
        <AnimatePresence mode="wait">
          {mode === "random" ? (
            <motion.div
              key="random-opts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#a1a1aa] font-medium">Length</span>
                  <span className="text-xs font-mono font-bold text-[#dc2626] bg-[#dc262610] px-2 py-0.5 rounded-md">{length}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={40}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full accent-[#dc2626] cursor-pointer"
                  aria-label="Password length"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Toggle label="Uppercase" checked={upper} onChange={setUpper} />
                <Toggle label="Lowercase" checked={lower} onChange={setLower} />
                <Toggle label="Numbers" checked={numbers} onChange={setNumbers} />
                <Toggle label="Symbols" checked={symbols} onChange={setSymbols} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="phrase-opts"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#a1a1aa] font-medium">Words</span>
                  <span className="text-xs font-mono font-bold text-[#dc2626] bg-[#dc262610] px-2 py-0.5 rounded-md">{words}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={words}
                  onChange={(e) => setWords(Number(e.target.value))}
                  className="w-full accent-[#dc2626] cursor-pointer"
                  aria-label="Number of words"
                />
              </div>
              <div>
                <div className="text-[11px] text-[#a1a1aa] font-medium mb-2">Separator</div>
                <div className="grid grid-cols-4 gap-2">
                  {SEPARATORS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setSeparator(s.value)}
                      className={`py-2 rounded-lg text-[10px] font-medium transition-all duration-200 cursor-pointer border ${
                        separator === s.value
                          ? "bg-[#dc262612] border-[#dc262640] text-[#e8e8ea]"
                          : "bg-[#111114] border-[#1e1e24] text-[#71717a] hover:border-[#2a2a34]"
                      }`}
                    >
                      <div className="font-mono text-sm">{s.value || "∅"}</div>
                      <div className="text-[8px] opacity-60">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Toggle label="Capitalize" checked={capitalize} onChange={setCapitalize} />
                <Toggle label="Add number" checked={includeNumber} onChange={setIncludeNumber} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[9px] text-[#52525b] text-center mt-5 flex items-center justify-center gap-1.5">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Generated in your browser with a cryptographic RNG — never sent anywhere
        </p>
      </div>
    </motion.div>
  );
}
