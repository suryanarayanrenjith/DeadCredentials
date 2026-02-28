"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ensurePuterReady } from "@/lib/puterAuth";
import { maskPassword } from "@/lib/apiUtils";
import type { ToneOption } from "@/lib/types";

// Puter global type is declared in lib/puterAuth.ts

/**
 * Render markdown bold/italic safely as React elements instead of
 * dangerouslySetInnerHTML — prevents XSS from AI-generated content.
 */
function renderMarkdownSafe(text: string): ReactNode[] {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pi) => {
    // Split into tokens: **bold**, *italic*, and plain text
    const parts: ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(para)) !== null) {
      if (match.index > lastIndex) {
        parts.push(para.slice(lastIndex, match.index));
      }
      if (match[2]) {
        // Bold **text**
        parts.push(<strong key={`${pi}-b-${match.index}`} className="text-[#e8e8ea]">{match[2]}</strong>);
      } else if (match[3]) {
        // Italic *text*
        parts.push(<em key={`${pi}-i-${match.index}`} className="text-[#d4d4d8]">{match[3]}</em>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < para.length) {
      parts.push(para.slice(lastIndex));
    }

    return <p key={pi} className={pi > 0 ? "mt-3" : ""}>{parts}</p>;
  });
}

interface BatchResult {
  password: string;
  masked: string;
  score: number;
  breachCount: number;
  crackTime: string;
  deathCause: string;
  alive: boolean;
}

interface BatchProcessorProps {
  visible: boolean;
  tone: ToneOption;
  setTone: (t: ToneOption) => void;
}

export default function BatchProcessor({ visible, tone, setTone }: BatchProcessorProps) {
  const [results, setResults] = useState<BatchResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryStreaming, setSummaryStreaming] = useState(false);
  const summaryGenerated = useRef(false);

  const processPasswords = useCallback(async (passwords: string[]) => {
    const unique = [...new Set(passwords.filter((p) => p.trim().length > 0))];
    if (unique.length === 0) {
      setError("No valid passwords found in the file.");
      return;
    }
    if (unique.length > 100) {
      setError("Maximum 100 passwords per batch. Your file has " + unique.length + ".");
      return;
    }

    setProcessing(true);
    setError("");
    setResults([]);
    setSummary("");
    summaryGenerated.current = false;
    setProgress({ current: 0, total: unique.length });

    const batchResults: BatchResult[] = [];

    for (let i = 0; i < unique.length; i++) {
      const password = unique[i].trim();
      setProgress({ current: i + 1, total: unique.length });

      try {
        const response = await fetch("/api/check-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, tone }),
        });

        if (response.ok) {
          const data = await response.json();
          batchResults.push({
            password,
            masked: maskPassword(password),
            score: data.characteristics.strengthScore,
            breachCount: data.breachCount,
            crackTime: data.characteristics.estimatedCrackTime,
            deathCause: data.characteristics.deathCause,
            alive: data.characteristics.strengthScore >= 80 && data.breachCount === 0,
          });
        } else {
          batchResults.push({
            password,
            masked: maskPassword(password),
            score: 0,
            breachCount: -1,
            crackTime: "error",
            deathCause: "Analysis failed",
            alive: false,
          });
        }
      } catch {
        batchResults.push({
          password,
          masked: maskPassword(password),
          score: 0,
          breachCount: -1,
          crackTime: "error",
          deathCause: "Network error",
          alive: false,
        });
      }

      setResults([...batchResults]);

      // Rate-limit: Small delay between requests
      if (i < unique.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setProcessing(false);
  }, [tone]);

  // Auto-generate summary when processing completes
  const generateSummary = useCallback(async (batchResults: BatchResult[]) => {
    if (batchResults.length === 0) return;
    setSummaryLoading(true);
    setSummaryStreaming(true);
    setSummary("");

    const alive = batchResults.filter((r) => r.alive).length;
    const dead = batchResults.filter((r) => !r.alive).length;
    const avg = Math.round(batchResults.reduce((s, r) => s + r.score, 0) / batchResults.length);
    const totalBreaches = batchResults.reduce((s, r) => s + Math.max(r.breachCount, 0), 0);
    const weakest = [...batchResults].sort((a, b) => a.score - b.score).slice(0, 3);
    const strongest = [...batchResults].sort((a, b) => b.score - a.score).slice(0, 3);

    const toneGuide: Record<ToneOption, string> = {
      victorian: "Write in an ornate Victorian-era eulogy style. Use flowery, dramatic prose with archaic phrases. Be theatrically mournful for the dead passwords and grandly celebratory for the survivors.",
      roast: "Write as a savage comedy roast. Be brutally funny, sarcastic, and merciless in mocking weak passwords. Celebrate strong ones with backhanded compliments. Use modern slang and humor.",
      hollywood: "Write as a dramatic Hollywood movie narrator. Use epic, cinematic language. Make it sound like a blockbuster movie trailer script. Add dramatic pauses and tension.",
    };

    const systemPrompt = `You are a password security analyst who writes batch audit summaries. ${toneGuide[tone]} Keep the summary to 3-5 paragraphs. Use markdown formatting (bold, italic). Do NOT use headers or bullet points.`;

    const userPrompt = `Write a batch obituary/summary for a password audit with these results:

- Total passwords analyzed: ${batchResults.length}
- Alive (strong & unbreached): ${alive}
- Dead (weak or breached): ${dead}
- Average strength score: ${avg}/100
- Total breach appearances: ${totalBreaches.toLocaleString()}
- Mortality rate: ${Math.round((dead / batchResults.length) * 100)}%

Weakest passwords (masked): ${weakest.map((w) => `${w.masked} (score: ${w.score}, breaches: ${w.breachCount >= 0 ? w.breachCount.toLocaleString() : "N/A"}, cause: ${w.deathCause})`).join("; ")}

Strongest passwords (masked): ${strongest.map((s) => `${s.masked} (score: ${s.score})`).join("; ")}

Write the summary now.`;

    try {
      await ensurePuterReady();
      if (!globalThis.puter) throw new Error("AI service is unavailable. Please refresh the page.");

      const stream = await globalThis.puter.ai.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          model: "gemini-2.0-flash",
          stream: true,
          temperature: 0.85,
        }
      );

      let fullText = "";
      for await (const part of stream) {
        if (part?.text) {
          fullText += part.text;
          setSummary(fullText);
        }
      }
      setSummaryStreaming(false);
    } catch (err) {
      console.error("Summary generation error:", err);
      setSummary("*Summary generation failed. Your batch results are still available above.*");
      setSummaryStreaming(false);
    } finally {
      setSummaryLoading(false);
    }
  }, [tone]);

  // Trigger summary generation when processing finishes
  useEffect(() => {
    if (!processing && results.length > 0 && !summaryGenerated.current && !summary) {
      summaryGenerated.current = true;
      generateSummary(results);
    }
  }, [processing, results, summary, generateSummary]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
        setError("Please upload a .csv or .txt file.");
        return;
      }
      if (file.size > 1024 * 100) {
        setError("File too large. Max 100KB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;

        // Parse CSV: try to extract passwords from first column or all lines
        const lines = text.split(/\r?\n/);
        const passwords: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          // Skip common CSV headers
          if (/^(password|pass|pwd|credentials?|secret|hash)/i.test(trimmed)) continue;

          // Take first column if comma-separated
          const firstCol = trimmed.split(",")[0].trim().replace(/^["']|["']$/g, "");
          if (firstCol.length > 0 && firstCol.length <= 128) {
            passwords.push(firstCol);
          }
        }

        processPasswords(passwords);
      };
      reader.readAsText(file);
    },
    [processPasswords]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so same file can be re-uploaded
      e.target.value = "";
    },
    [handleFile]
  );

  const exportCSV = useCallback(() => {
    if (results.length === 0) return;
    const header = "Password (Masked),Score,Status,Breach Count,Crack Time,Cause of Death";
    const rows = results.map(
      (r) =>
        `"${r.masked}",${r.score},${r.alive ? "ALIVE" : "DEAD"},${r.breachCount >= 0 ? r.breachCount : "Error"},"${r.crackTime}","${r.deathCause}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deadcredentials-batch-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  if (!visible) return null;

  const aliveCount = results.filter((r) => r.alive).length;
  const deadCount = results.filter((r) => !r.alive).length;
  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto mt-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-[#0c0c0f]/80 backdrop-blur-sm border border-[#1e1e24] rounded-2xl p-6 gradient-border">
        <div className="flex items-center gap-2.5 mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3 className="text-sm font-semibold text-[#e8e8ea] tracking-wide">Batch Password Audit</h3>
          <span className="text-[9px] text-[#52525b] ml-auto font-mono uppercase tracking-wider">CSV / TXT</span>
        </div>

        {/* Tone Selector for Batch */}
        {!processing && results.length === 0 && (
          <div className="mb-4">
            <div className="text-[10px] text-[#52525b] uppercase tracking-wider font-mono mb-2">Obituary Tone</div>
            <div className="flex gap-2">
              {[
                { value: "victorian" as ToneOption, label: "Victorian", icon: "🪶", desc: "Elegant & formal" },
                { value: "roast" as ToneOption, label: "Roast", icon: "🔥", desc: "Brutally funny" },
                { value: "hollywood" as ToneOption, label: "Hollywood", icon: "🎬", desc: "Dramatic & epic" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-center transition-all duration-200 cursor-pointer border ${
                    tone === t.value
                      ? "bg-[#dc262612] border-[#dc262640] text-[#e8e8ea]"
                      : "bg-[#111114] border-[#1e1e24] text-[#71717a] hover:border-[#2a2a34]"
                  }`}
                >
                  <div className="text-sm">{t.icon}</div>
                  <div className="text-[10px] font-medium mt-0.5">{t.label}</div>
                  <div className="text-[8px] text-[#52525b] mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload Zone */}
        {!processing && results.length === 0 && (
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
              dragOver
                ? "border-[#dc2626] bg-[#dc262610]"
                : "border-[#1e1e24] hover:border-[#2a2a34] hover:bg-[#111114]"
            }`}
            role="button"
            tabIndex={0}
            aria-label="Upload password file. Drag and drop or click to browse."
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileInput}
            />

            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#dc262610] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[#a1a1aa] font-medium">
                  Drop a CSV file here or <span className="text-[#dc2626] underline">browse</span>
                </p>
                <p className="text-[10px] text-[#52525b] mt-1.5 leading-relaxed">
                  One password per line, or first column of CSV. Max 100 passwords.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {processing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#a1a1aa] font-mono">
                Analyzing {progress.current} / {progress.total}
              </span>
              <span className="text-[#dc2626] font-mono font-bold">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-[#1e1e24] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#dc2626] to-[#ef4444] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="text-[10px] text-[#52525b] text-center animate-pulse">
              Checking against breach databases...
            </div>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mt-3 p-3 bg-[#dc262608] border border-[#dc262625] rounded-xl text-xs text-[#dc2626] text-center"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-4 space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[#e8e8ea] font-mono">{results.length}</div>
                <div className="text-[9px] text-[#52525b] uppercase tracking-wider mt-0.5">Analyzed</div>
              </div>
              <div className="bg-[#111114] border border-[#10b98120] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[#10b981] font-mono">{aliveCount}</div>
                <div className="text-[9px] text-[#52525b] uppercase tracking-wider mt-0.5">Alive</div>
              </div>
              <div className="bg-[#111114] border border-[#dc262620] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[#dc2626] font-mono">{deadCount}</div>
                <div className="text-[9px] text-[#52525b] uppercase tracking-wider mt-0.5">Dead</div>
              </div>
            </div>

            {/* Average Score Bar */}
            <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-3">
              <div className="flex items-center justify-between text-[10px] mb-1.5">
                <span className="text-[#71717a] uppercase tracking-wider font-mono">Average Score</span>
                <span
                  className="font-bold font-mono"
                  style={{ color: avgScore >= 80 ? "#10b981" : avgScore >= 40 ? "#f59e0b" : "#dc2626" }}
                >
                  {avgScore}/100
                </span>
              </div>
              <div className="h-2 bg-[#1e1e24] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${avgScore}%`,
                    backgroundColor: avgScore >= 80 ? "#10b981" : avgScore >= 40 ? "#f59e0b" : "#dc2626",
                  }}
                />
              </div>
            </div>

            {/* Results Table */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1" style={{ scrollbarWidth: "thin" }}>
              {results.map((r, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#0c0c0f] border border-[#1a1a20] hover:border-[#2a2a32] transition-colors duration-200"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm flex-shrink-0">{r.alive ? "🛡️" : "💀"}</span>
                    <span className="font-mono text-xs text-[#d4d4d8] truncate">{r.masked}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {r.breachCount > 0 && (
                      <span className="text-[9px] text-[#dc2626] font-mono">
                        {r.breachCount.toLocaleString()} breaches
                      </span>
                    )}
                    <div className="h-1.5 w-12 rounded-full bg-[#1e1e24] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${r.score}%`,
                          backgroundColor: r.score >= 80 ? "#10b981" : r.score >= 40 ? "#f59e0b" : "#dc2626",
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-mono font-bold min-w-[24px] text-right"
                      style={{ color: r.alive ? "#10b981" : "#dc2626" }}
                    >
                      {r.score}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                onClick={exportCSV}
                className="flex-1 py-2.5 px-4 bg-[#111114] border border-[#1e1e24] rounded-xl text-xs text-[#a1a1aa] font-medium hover:border-[#2a2a34] hover:bg-[#18181c] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Results (.csv)
              </button>
              <button
                onClick={() => {
                  setResults([]);
                  setProgress({ current: 0, total: 0 });
                  setError("");
                  setSummary("");
                  summaryGenerated.current = false;
                }}
                className="py-2.5 px-4 bg-[#111114] border border-[#1e1e24] rounded-xl text-xs text-[#71717a] font-medium hover:border-[#2a2a34] hover:bg-[#18181c] transition-all duration-200 cursor-pointer"
              >
                New Batch
              </button>
            </div>

            {/* Batch Obituary Summary */}
            <AnimatePresence>
              {(summaryLoading || summary) && (
                <motion.div
                  className="mt-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="bg-[#0c0c0f] border border-[#1e1e24] rounded-2xl p-5 relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 mb-4">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <span className="text-xs font-semibold text-[#e8e8ea] tracking-wide">Batch Obituary</span>
                      <span className="text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ml-auto"
                        style={{
                          color: tone === "victorian" ? "#a78bfa" : tone === "roast" ? "#f97316" : "#60a5fa",
                          borderColor: tone === "victorian" ? "#a78bfa30" : tone === "roast" ? "#f9731630" : "#60a5fa30",
                          backgroundColor: tone === "victorian" ? "#a78bfa08" : tone === "roast" ? "#f9731608" : "#60a5fa08",
                        }}
                      >
                        {tone}
                      </span>
                    </div>

                    {/* Summary content */}
                    {summaryLoading && !summary ? (
                      <div className="flex items-center gap-3 py-6 justify-center">
                        <svg className="animate-spin h-4 w-4 text-[#dc2626]" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-[11px] text-[#71717a] animate-pulse">Composing batch obituary...</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <div
                          className="text-[12px] leading-[1.8] text-[#a1a1aa] whitespace-pre-wrap"
                          style={{ fontFamily: "var(--font-obituary, Georgia, serif)" }}
                        >
                          {renderMarkdownSafe(summary)}
                          {summaryStreaming && (
                            <span className="inline-block w-[2px] h-[14px] bg-[#dc2626] ml-0.5 animate-pulse align-middle" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Regenerate button */}
                    {!summaryLoading && summary && (
                      <button
                        onClick={() => {
                          setSummary("");
                          generateSummary(results);
                        }}
                        className="mt-4 w-full py-2 px-3 rounded-xl text-[10px] font-medium text-[#71717a] border border-[#1e1e24] hover:border-[#2a2a34] hover:text-[#a1a1aa] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                        Regenerate Summary
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <p className="text-[9px] text-[#52525b] text-center mt-4 flex items-center justify-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Passwords are analyzed locally and via HIBP — never stored
        </p>
      </div>
    </motion.div>
  );
}
