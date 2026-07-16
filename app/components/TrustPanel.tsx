"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GITHUB_URL = "https://github.com/suryanarayanrenjith/DeadCredentials";

const POINTS: { icon: string; title: string; body: string }[] = [
  {
    icon: "🔒",
    title: "Hashed in your browser",
    body: "Your password is SHA-1 hashed on your device. Only the first 5 characters of that hash are sent to Have I Been Pwned. The password itself — and the other 35 hash characters — never leave your device.",
  },
  {
    icon: "🚫",
    title: "No server ever receives it",
    body: "There is no backend endpoint that accepts a password. Strength analysis, hashing, breach lookup, and password generation all run entirely in your browser.",
  },
  {
    icon: "🤖",
    title: "The AI only sees statistics",
    body: "Obituaries are written from numbers — length, entropy, breach count — with the password shown only as dots. The model never receives your actual characters.",
  },
  {
    icon: "💾",
    title: "Nothing is stored",
    body: "No database, no server logs of passwords, no cookies, no analytics, no tracking. Close the tab and it's gone.",
  },
  {
    icon: "📖",
    title: "100% open source",
    body: "Every line is public on GitHub. Don't take our word for it — read the code, or fork and run it yourself.",
  },
  {
    icon: "🔍",
    title: "Verify it yourself",
    body: "Open your browser's DevTools → Network tab and run a check. The only external request you'll see is a 5-character prefix to api.pwnedpasswords.com.",
  },
];

export default function TrustPanel() {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className="w-full max-w-lg mx-auto mt-6 relative z-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
    >
      <div className="rounded-2xl border border-[#10b98125] bg-[#0a120f]/70 backdrop-blur-sm overflow-hidden">
        {/* Header bar (always visible) */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[#10b98108] transition-colors duration-200"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#10b98115] border border-[#10b98130] flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-semibold text-[#e8e8ea] leading-tight">
              Your password never leaves this device
            </span>
            <span className="block text-[10px] text-[#6b8a7a] mt-0.5">
              Not a harvester — and you can prove it. Tap to see how.
            </span>
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"
            className={`flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Expandable details */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="trust-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-[#10b98118]"
            >
              <div className="p-4 space-y-2.5">
                {POINTS.map((p, i) => (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="flex items-start gap-3 rounded-xl bg-[#0c0c0f]/60 border border-[#141b18] p-3"
                  >
                    <span className="text-base leading-none mt-0.5 flex-shrink-0">{p.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#d4d4d8] mb-0.5">{p.title}</div>
                      <div className="text-[11px] text-[#8a9a92] leading-relaxed">{p.body}</div>
                    </div>
                  </motion.div>
                ))}

                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#10b98110] border border-[#10b98130] text-[#10b981] text-xs font-semibold hover:bg-[#10b98118] transition-colors duration-200"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
                  </svg>
                  Read the source code on GitHub
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
