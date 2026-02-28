"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
}

function maskPassword(password: string): string {
  if (password.length <= 2) return "*".repeat(password.length);
  if (password.length <= 4) return password[0] + "*".repeat(password.length - 1);
  const first = password.slice(0, 2);
  const last = password.slice(-2);
  const middle = "*".repeat(Math.min(password.length - 4, 6));
  return first + middle + last;
}

export default function BatchProcessor({ visible }: BatchProcessorProps) {
  const [results, setResults] = useState<BatchResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setProgress({ current: 0, total: unique.length });

    const batchResults: BatchResult[] = [];

    for (let i = 0; i < unique.length; i++) {
      const password = unique[i].trim();
      setProgress({ current: i + 1, total: unique.length });

      try {
        const response = await fetch("/api/check-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, tone: "victorian" }),
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
  }, []);

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

        {/* Upload Zone */}
        {!processing && results.length === 0 && (
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
              dragOver
                ? "border-[#dc2626] bg-[#dc262610]"
                : "border-[#1e1e24] hover:border-[#2a2a34] hover:bg-[#111114]"
            }`}
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
                }}
                className="py-2.5 px-4 bg-[#111114] border border-[#1e1e24] rounded-xl text-xs text-[#71717a] font-medium hover:border-[#2a2a34] hover:bg-[#18181c] transition-all duration-200 cursor-pointer"
              >
                New Batch
              </button>
            </div>
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
