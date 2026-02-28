"use client";

import React, { useMemo, useRef, useState } from "react";

interface ObituaryCardProps {
  obituary: string;
  breachCount: number;
  deathCause: string;
  maskedPassword: string;
  isStreaming: boolean;
  score: number;
  tone?: "victorian" | "roast" | "hollywood";
}

/** Parse raw obituary text into a title + paragraphs */
function parseObituary(raw: string): { title: string; paragraphs: string[] } {
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  let title = "";
  const paragraphs: string[] = [];

  for (const line of lines) {
    const stripped = line.replace(/^[#*\s]+/, "").replace(/\*+$/, "").trim();
    if (
      !title &&
      (stripped.toUpperCase().startsWith("IN MEMORIAM") ||
        stripped.toUpperCase().startsWith("FAREWELL") ||
        stripped.toUpperCase().startsWith("REST IN PEACE") ||
        stripped.startsWith("**IN MEMORIAM") ||
        stripped.startsWith("**FAREWELL") ||
        stripped.startsWith("**REST IN PEACE"))
    ) {
      title = stripped.replace(/^\*+/, "").replace(/\*+$/, "").trim();
    } else if (stripped.length > 0) {
      paragraphs.push(stripped);
    }
  }

  if (!title && paragraphs.length > 0) {
    title = paragraphs.shift()!;
  }

  return { title, paragraphs };
}

/*
 * Robust iterative text formatter.
 * Escapes masked password with PW_TOKEN before parsing markdown.
 * Always displays password as ●●●●●●●● (never real or masked value).
 */
interface TextSegment {
  type: "text" | "bold" | "italic" | "quote" | "password";
  content: string;
}

const PW_TOKEN = "\x01PW\x01";
const DOT_PASSWORD = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

function restore(s: string, pw: string | undefined): string {
  if (!pw || !s.includes(PW_TOKEN)) return s;
  return s.split(PW_TOKEN).join(pw);
}

function tokenize(text: string, maskedPassword?: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let input = text;

  // Also catch bullet-dot passwords that the AI might produce
  const dotPw = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

  if (maskedPassword) {
    input = text.split(maskedPassword).join(PW_TOKEN);
  }
  // Also replace dot password strings the AI literally wrote
  input = input.split(dotPw).join(PW_TOKEN);

  let i = 0;
  let buffer = "";

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    if (buffer.includes(PW_TOKEN)) {
      const parts = buffer.split(PW_TOKEN);
      parts.forEach((part, idx) => {
        if (part) segments.push({ type: "text", content: part });
        if (idx < parts.length - 1)
          segments.push({ type: "password", content: DOT_PASSWORD });
      });
    } else {
      segments.push({ type: "text", content: buffer });
    }
    buffer = "";
  };

  while (i < input.length) {
    if (input[i] === "*" && input[i + 1] === "*") {
      const closeIdx = input.indexOf("**", i + 2);
      if (closeIdx !== -1 && closeIdx - i - 2 > 0 && closeIdx - i < 300) {
        flushBuffer();
        let content = input.slice(i + 2, closeIdx);
        if (content.includes(PW_TOKEN)) {
          // The bold content is a password reference
          const boldParts = content.split(PW_TOKEN);
          boldParts.forEach((part, idx) => {
            if (part) segments.push({ type: "bold", content: part });
            if (idx < boldParts.length - 1)
              segments.push({ type: "password", content: DOT_PASSWORD });
          });
        } else {
          content = restore(content, maskedPassword);
          segments.push({ type: "bold", content });
        }
        i = closeIdx + 2;
        continue;
      }
    }

    if (
      input[i] === "*" &&
      input[i + 1] !== "*" &&
      (i === 0 || input[i - 1] !== "*")
    ) {
      const closeIdx = input.indexOf("*", i + 1);
      if (closeIdx !== -1 && closeIdx - i - 1 > 0 && closeIdx - i < 150 && input[closeIdx + 1] !== "*") {
        const inner = input.slice(i + 1, closeIdx);
        if (!inner.includes("\n") && !inner.includes("*")) {
          flushBuffer();
          if (inner.includes(PW_TOKEN)) {
            const italParts = inner.split(PW_TOKEN);
            italParts.forEach((part, idx) => {
              if (part) segments.push({ type: "italic", content: part });
              if (idx < italParts.length - 1)
                segments.push({ type: "password", content: DOT_PASSWORD });
            });
          } else {
            segments.push({ type: "italic", content: restore(inner, maskedPassword) });
          }
          i = closeIdx + 1;
          continue;
        }
      }
    }

    if (input[i] === '"') {
      const closeIdx = input.indexOf('"', i + 1);
      if (closeIdx !== -1 && closeIdx - i < 120) {
        flushBuffer();
        let quoteContent = input.slice(i, closeIdx + 1);
        if (quoteContent.includes(PW_TOKEN)) {
          const qParts = quoteContent.split(PW_TOKEN);
          qParts.forEach((part, idx) => {
            if (part) segments.push({ type: "quote", content: part });
            if (idx < qParts.length - 1)
              segments.push({ type: "password", content: DOT_PASSWORD });
          });
        } else {
          segments.push({ type: "quote", content: restore(quoteContent, maskedPassword) });
        }
        i = closeIdx + 1;
        continue;
      }
    }

    buffer += input[i];
    i++;
  }

  flushBuffer();
  return segments;
}

function FormattedText({ text, maskedPassword }: { text: string; maskedPassword?: string }) {
  const segments = tokenize(text, maskedPassword);
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case "bold":
            return (
              <strong key={i} className="text-[#f5e6c8] font-bold">
                {seg.content}
              </strong>
            );
          case "italic":
            return (
              <em key={i} className="text-[#c4b599] italic">
                {seg.content}
              </em>
            );
          case "quote":
            return (
              <span key={i} className="text-[#c9302c] font-semibold">
                {seg.content}
              </span>
            );
          case "password":
            return (
              <span key={i} className="text-[#c9302c] font-mono font-bold tracking-wider">
                {seg.content}
              </span>
            );
          default:
            return <span key={i}>{seg.content}</span>;
        }
      })}
    </>
  );
}

export default function ObituaryCard({
  obituary,
  breachCount,
  deathCause,
  maskedPassword,
  isStreaming,
  score,
  tone = "victorian",
}: ObituaryCardProps) {
  const [shareState, setShareState] = useState<"idle" | "capturing" | "done">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseObituary(obituary), [obituary]);

  const handleDownloadPNG = async () => {
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
      link.download = `deadcredentials-obituary.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareState("done");
      setTimeout(() => setShareState("idle"), 2500);
    } catch (err) {
      console.error("Download failed:", err);
      setShareState("idle");
    }
  };

  const handleShareToX = () => {
    const text = encodeURIComponent(
      "My password just died. DeadCredentials wrote its obituary \uD83D\uDC80\nCheck yours: https://deadcredentials.vercel.app #DeadCredentials #CyberSecurity"
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  if (!obituary && !isStreaming) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-fade-in-up">
      {/* Shareable content wrapper */}
      <div ref={cardRef} className="relative">
        {/* Breach Count Banner */}
        {breachCount > 0 && (
          <div className="mb-5 flex items-center justify-center gap-3 py-3.5 px-5 bg-[#dc262610] border border-[#dc262630] rounded-2xl animate-scale-in">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#dc262620]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[#dc2626] font-bold text-lg font-mono animate-count-up">
                {breachCount.toLocaleString()}
              </span>
              <span className="text-[#ef4444] text-[11px] uppercase tracking-wider font-medium -mt-0.5 opacity-70">
                times seen in breaches
              </span>
            </div>
          </div>
        )}

        {breachCount === 0 && obituary && (
          <div className="mb-5 flex items-center justify-center gap-3 py-3.5 px-5 bg-[#10b98110] border border-[#10b98130] rounded-2xl animate-scale-in">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#10b98120]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <span className="text-[#10b981] font-semibold text-sm">
              Not found in any known data breaches
            </span>
          </div>
        )}

        {/* Gravestone Header with Candles */}
        <div className="flex items-end justify-center gap-4 mb-5">
          <CandleSVG side="left" />
          <GravestoneSVG score={score} />
          <CandleSVG side="right" />
        </div>

        {/* Obituary Card — Tone-specific styling */}
        <div className={`obituary-card obituary-aged-border tone-${tone} rounded-2xl p-8 md:p-10 relative overflow-hidden`}>
          {/* Corner ornaments — color adapts to tone */}
          {(() => {
            const cornerColor = tone === "hollywood" ? "border-[#6366f1]/25" : tone === "roast" ? "border-[#dc2626]/25" : "border-[#8b6914]/30";
            return (
              <>
                <div className={`absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 ${cornerColor} rounded-tl-sm`} />
                <div className={`absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 ${cornerColor} rounded-tr-sm`} />
                <div className={`absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 ${cornerColor} rounded-bl-sm`} />
                <div className={`absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 ${cornerColor} rounded-br-sm`} />
              </>
            );
          })()}

          {/* Tone-specific newspaper header */}
          {tone === "victorian" && (
            <div className="text-center mb-6 pb-5 border-b border-[#8b6914]/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#8b6914]/25 to-transparent" />
                <span className="obituary-gazette-title text-[11px] tracking-[0.5em] uppercase text-[#8b6914] font-medium">
                  The Daily Breach Gazette
                </span>
                <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#8b6914]/25 to-transparent" />
              </div>
              <div className="flex items-center justify-center gap-3 text-[9px] text-[#6b5a3e]/60 font-serif italic">
                <span>Est. 1847</span>
                <span className="text-[#8b6914]/40">&diams;</span>
                <span>&ldquo;All passwords must eventually expire&rdquo;</span>
                <span className="text-[#8b6914]/40">&diams;</span>
                <span>Vol. CLXXVIII</span>
              </div>
            </div>
          )}

          {tone === "roast" && (
            <div className="text-center mb-6 pb-5 border-b border-[#dc2626]/15">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#dc2626]/20 to-transparent" />
                <span className="text-[11px] tracking-[0.4em] uppercase text-[#ff4444] font-bold font-sans">
                  🔥 THE ROAST REPORT 🔥
                </span>
                <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#dc2626]/20 to-transparent" />
              </div>
              <div className="text-[9px] text-[#dc2626]/50 font-sans italic">
                &ldquo;No password is safe from the burn&rdquo;
              </div>
            </div>
          )}

          {tone === "hollywood" && (
            <div className="text-center mb-6 pb-5 border-b border-[#6366f1]/15">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#6366f1]/20 to-transparent" />
                <span className="text-[11px] tracking-[0.5em] uppercase text-[#818cf8] font-medium font-serif">
                  🎬 FINAL ACT PICTURES PRESENTS 🎬
                </span>
                <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#6366f1]/20 to-transparent" />
              </div>
              <div className="flex items-center justify-center gap-3 text-[9px] text-[#6366f1]/40 font-serif italic">
                <span>A Cybersecurity Production</span>
                <span className="text-[#6366f1]/30">&bull;</span>
                <span>&ldquo;Every password has a final scene&rdquo;</span>
              </div>
            </div>
          )}

          {/* Cause of death badge */}
          <div className="flex justify-center mb-6">
            <span
              className="text-[10px] uppercase tracking-[0.15em] px-4 py-1.5 rounded-full font-serif font-medium"
              style={{
                backgroundColor: tone === "hollywood" ? "#0e1020" : tone === "roast" ? "#1a0c0c" : "#1a1510",
                color: tone === "hollywood" ? "#818cf8" : "#c9302c",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: tone === "hollywood" ? "#6366f125" : tone === "roast" ? "#dc262625" : "#8b691425",
              }}
            >
              {tone === "roast" ? "💀 " : ""}Cause of Death: {deathCause}
            </span>
          </div>

          {/* Formatted Obituary */}
          <div className="obituary-text">
            {parsed.title && (
              <div className="obituary-title">
                <FormattedText text={parsed.title} maskedPassword={maskedPassword} />
              </div>
            )}

            {parsed.paragraphs.map((para, i) => (
              <p key={i} className="obituary-paragraph">
                <FormattedText text={para} maskedPassword={maskedPassword} />
              </p>
            ))}

            {isStreaming && obituary && (
              <span className="inline-block w-0.5 h-4 bg-[#c9302c] ml-0.5 cursor-blink rounded-full" />
            )}
          </div>

          {/* Loading skeleton */}
          {isStreaming && !obituary && (
            <div className="space-y-4">
              <div className="skeleton-pulse h-6 w-2/3 mx-auto rounded-lg" />
              <div className="h-px bg-[#8b6914]/10 my-3" />
              <div className="skeleton-pulse h-4 w-full rounded" />
              <div className="skeleton-pulse h-4 w-5/6 rounded" />
              <div className="skeleton-pulse h-4 w-full rounded" />
              <div className="skeleton-pulse h-4 w-4/5 rounded" />
              <div className="h-3" />
              <div className="skeleton-pulse h-4 w-full rounded" />
              <div className="skeleton-pulse h-4 w-3/4 rounded" />
              <div className="skeleton-pulse h-4 w-5/6 rounded" />
            </div>
          )}

          {/* Footer with epitaph */}
          {obituary && !isStreaming && (
            <div
              className="mt-8 pt-5 border-t"
              style={{ borderColor: tone === "hollywood" ? "#6366f115" : tone === "roast" ? "#dc262612" : "#8b691415" }}
            >
              <div className="text-center mb-1">
                {tone === "victorian" && (
                  <div className="text-[10px] text-[#6b5a3e]/50 italic font-serif flex items-center justify-center gap-2">
                    <span className="text-[#8b6914]/40">&#x2020;</span>
                    <span>May stronger passwords take its place</span>
                    <span className="text-[#8b6914]/40">&#x2020;</span>
                  </div>
                )}
                {tone === "roast" && (
                  <div className="text-[10px] text-[#dc2626]/50 italic font-sans flex items-center justify-center gap-2">
                    <span>🎤</span>
                    <span>DJ CrackMaster drops the mic. This password is done.</span>
                  </div>
                )}
                {tone === "hollywood" && (
                  <div className="text-[10px] text-[#6366f1]/40 italic font-serif flex items-center justify-center gap-2">
                    <span>🎬</span>
                    <span>DIRECTED BY BRUTE_FORCE &bull; PRODUCED BY HASHCAT STUDIOS</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Watermark — bottom right */}
          <div className="absolute bottom-4 right-5 opacity-30">
            <span className="text-[8px] text-[#8b6914] tracking-[0.15em] uppercase font-serif italic">
              Generated by DeadCredentials
            </span>
          </div>
        </div>

        {/* Branding watermark for screenshots */}
        {obituary && !isStreaming && (
          <div className="mt-3 text-center">
            <span className="text-[10px] text-[#52525b] tracking-widest uppercase font-medium">
              &#x1F480; DeadCredentials
            </span>
          </div>
        )}
      </div>

      {/* Share buttons — OUTSIDE the capture area for clean screenshots */}
      {obituary && !isStreaming && (
        <div className="flex items-center gap-2.5 mt-5">
          {/* Download PNG */}
          <button
            onClick={handleDownloadPNG}
            disabled={shareState === "capturing"}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer disabled:opacity-50 shadow-[0_0_16px_#dc262625] hover:shadow-[0_0_24px_#dc262640] active:scale-[0.98]"
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PNG
              </>
            )}
          </button>

          {/* Share to X */}
          <button
            onClick={handleShareToX}
            className="flex items-center justify-center gap-2 py-2.5 px-5 bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] text-xs font-medium rounded-xl border border-[#27272a] transition-all duration-200 cursor-pointer hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share to X
          </button>
        </div>
      )}

      {/* Password Tips */}
      {obituary && !isStreaming && (
        <div className="mt-6 bg-[#111114] border border-[#1e1e24] rounded-2xl p-5 animate-fade-in-up gradient-border">
          <h3 className="text-sm font-semibold text-[#e8e8ea] mb-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#10b98115] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
              </svg>
            </div>
            Resurrection Guide
          </h3>
          <ul className="text-xs text-[#a1a1aa] space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="text-[#dc2626] mt-0.5 text-[10px]">&#x25B8;</span>
              <span>Use <strong className="text-[#d4d4d8]">16+ characters</strong> with uppercase, lowercase, numbers, and symbols</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#dc2626] mt-0.5 text-[10px]">&#x25B8;</span>
              <span>Use a <strong className="text-[#d4d4d8]">passphrase</strong> combine random, unrelated words</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#dc2626] mt-0.5 text-[10px]">&#x25B8;</span>
              <span><strong className="text-[#d4d4d8]">Never reuse</strong> passwords across different sites</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#dc2626] mt-0.5 text-[10px]">&#x25B8;</span>
              <span>Use a <strong className="text-[#d4d4d8]">password manager</strong> to generate and store unique passwords</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#dc2626] mt-0.5 text-[10px]">&#x25B8;</span>
              <span>Enable <strong className="text-[#d4d4d8]">two-factor authentication</strong> whenever possible</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function GravestoneSVG({ score }: { score: number }) {
  const crackLevel = score >= 70 ? 0 : score >= 50 ? 1 : score >= 30 ? 2 : score >= 10 ? 3 : 4;

  return (
    <svg width="72" height="92" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(220,38,38,0.15)]">
      <path d="M10 95V35C10 18 22 5 40 5C58 5 70 18 70 35V95" fill="#18181b" stroke="#27272a" strokeWidth="1.5" />
      <rect x="5" y="90" width="70" height="10" rx="2" fill="#18181b" stroke="#27272a" strokeWidth="1.5" />
      {/* Skull icon instead of cross */}
      <circle cx="40" cy="30" r="8" fill="none" stroke="#dc2626" strokeWidth="1" opacity="0.7" />
      <circle cx="37" cy="28" r="1.5" fill="#dc2626" opacity="0.6" />
      <circle cx="43" cy="28" r="1.5" fill="#dc2626" opacity="0.6" />
      <path d="M38 33L40 35L42 33" stroke="#dc2626" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Lock symbol below skull */}
      <rect x="36" y="44" width="8" height="7" rx="1" fill="none" stroke="#3f3f46" strokeWidth="1.2" />
      <path d="M38 44V41a2 2 0 0 1 4 0v3" stroke="#3f3f46" strokeWidth="1.2" fill="none" />
      <circle cx="40" cy="48" r="0.8" fill="#3f3f46" />
      {/* Decorative dots */}
      <circle cx="25" cy="78" r="1" fill="#27272a" />
      <circle cx="55" cy="78" r="1" fill="#27272a" />
      <circle cx="40" cy="75" r="1" fill="#27272a" />

      <g className="gravestone-crack">
        {crackLevel >= 0 && <path d="M38 20 L40 28 L37 33" stroke="#dc2626" strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.3" />}
        {crackLevel >= 1 && <path d="M36 15 L39 32 L34 45 L38 60" stroke="#dc2626" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />}
        {crackLevel >= 2 && (
          <>
            <path d="M50 20 L47 37 L52 50 L48 65" stroke="#dc2626" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
            <path d="M39 32 L44 38" stroke="#dc2626" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.35" />
          </>
        )}
        {crackLevel >= 3 && (
          <>
            <path d="M30 40 L35 50 L32 62 L36 75" stroke="#dc2626" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.55" />
            <path d="M47 37 L42 42" stroke="#dc2626" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.4" />
            <path d="M55 35 L52 42" stroke="#dc2626" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.3" />
            <circle cx="15" cy="55" r="1.5" fill="#dc262630" />
            <circle cx="63" cy="48" r="1" fill="#dc262625" />
          </>
        )}
        {crackLevel >= 4 && (
          <>
            <path d="M25 25 L28 38 L23 52 L27 68 L24 82" stroke="#dc2626" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.7" />
            <path d="M55 18 L53 30 L58 42 L54 55 L57 70" stroke="#dc2626" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
            <path d="M34 45 L30 50" stroke="#dc2626" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.45" />
            <path d="M52 50 L56 55" stroke="#dc2626" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.4" />
            <path d="M40 60 L43 68 L38 78" stroke="#dc2626" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
            <rect x="12" y="85" width="4" height="3" rx="0.5" fill="#18181b" stroke="#dc262640" strokeWidth="0.5" transform="rotate(-15 14 86)" />
            <rect x="60" y="83" width="3" height="4" rx="0.5" fill="#18181b" stroke="#dc262640" strokeWidth="0.5" transform="rotate(10 61 85)" />
          </>
        )}
      </g>

      <g fill="#18181b" stroke="#27272a" strokeWidth="0.5">
        <ellipse cx="15" cy="96" rx="6" ry="2" />
        <ellipse cx="40" cy="97" rx="8" ry="2" />
        <ellipse cx="65" cy="96" rx="6" ry="2" />
      </g>
    </svg>
  );
}

function CandleSVG({ side }: { side: "left" | "right" }) {
  return (
    <div className="flex flex-col items-center" style={{ marginBottom: "2px" }}>
      <div className="candle-glow relative">
        <svg width="16" height="24" viewBox="0 0 20 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="candle-flame">
          <defs>
            <radialGradient id={`flameGrad-${side}`} cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#dc262680" />
            </radialGradient>
          </defs>
          <ellipse cx="10" cy="18" rx="6" ry="8" fill="#f59e0b" opacity="0.12" />
          <path d="M10 2C10 2 5 12 5 18C5 22 7 26 10 26C13 26 15 22 15 18C15 12 10 2 10 2Z" fill={`url(#flameGrad-${side})`} />
          <path d="M10 10C10 10 8 16 8 19C8 21 9 23 10 23C11 23 12 21 12 19C12 16 10 10 10 10Z" fill="#fef3c7" opacity="0.8" />
        </svg>
      </div>
      <svg width="12" height="36" viewBox="0 0 16 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4C3 4 2 8 3 10C4 12 5 8 5 6" fill="#d4d4d8" opacity="0.3" />
        <path d="M11 6C11 6 12 10 11 12C10 14 9 10 9 8" fill="#d4d4d8" opacity="0.25" />
        <rect x="3" y="2" width="10" height="42" rx="1.5" fill="#27272a" stroke="#3f3f46" strokeWidth="0.5" />
        <rect x="5" y="3" width="2" height="40" rx="1" fill="#3f3f46" opacity="0.3" />
        <line x1="8" y1="0" x2="8" y2="3" stroke="#52525b" strokeWidth="0.8" />
        <rect x="1" y="42" width="14" height="5" rx="1" fill="#18181b" stroke="#3f3f46" strokeWidth="0.5" />
        <rect x="0" y="44" width="16" height="3" rx="1" fill="#18181b" stroke="#3f3f46" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
