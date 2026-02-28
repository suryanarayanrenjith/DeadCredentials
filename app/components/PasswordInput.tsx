"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validatePasswordInput } from "@/lib/passwordValidator";

interface PasswordInputProps {
  onSubmit: (password: string) => void;
  isLoading: boolean;
}

export default function PasswordInput({ onSubmit, isLoading }: PasswordInputProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);

  const validation = useMemo(() => validatePasswordInput(password), [password]);
  const showError = touched && password.length > 0 && !validation.valid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (validation.valid && !isLoading) {
      onSubmit(password);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (!touched && e.target.value.length > 2) {
      setTouched(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
      <div className="relative group">
        <div className="flex items-center gap-2 bg-[#111114]/80 backdrop-blur-sm border border-[#1e1e24] rounded-2xl p-2.5 input-glow transition-all duration-300">
          {/* Skull icon */}
          <div className="pl-3 text-[#52525b] group-focus-within:text-[#dc2626] transition-colors duration-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="8" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" />
              <circle cx="15" cy="9" r="1.5" fill="currentColor" />
              <path d="M9 18v3M15 18v3M12 14v2" />
              <path d="M8 14c1.333 1 2.667 1.5 4 1.5s2.667-.5 4-1.5" />
            </svg>
          </div>

          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={handleChange}
            onBlur={() => setTouched(true)}
            placeholder="Enter a password to analyze..."
            className="flex-1 bg-transparent outline-none text-[#e8e8ea] placeholder:text-[#52525b] py-2.5 text-base tracking-wide"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={128}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-2.5 text-[#52525b] hover:text-[#dc2626] transition-all duration-200 cursor-pointer rounded-xl hover:bg-[#dc262610] group/eye"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="transition-transform duration-200 group-hover/eye:scale-110">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="transition-transform duration-200 group-hover/eye:scale-110">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="1" fill="currentColor" className="animate-pulse" />
              </svg>
            )}
          </button>
        </div>

        {/* Validation feedback */}
        <AnimatePresence>
          {showError && (
            <motion.div
              className="flex items-center gap-2 mt-2.5 px-3.5"
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-[11px] text-[#f59e0b] font-medium tracking-wide">
                {validation.reason}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="submit"
        disabled={!validation.valid || isLoading}
        whileHover={!isLoading && validation.valid ? { scale: 1.02, y: -2 } : {}}
        whileTap={!isLoading && validation.valid ? { scale: 0.98 } : {}}
        className="mt-5 w-full py-3.5 px-6 bg-gradient-to-b from-[#dc2626] to-[#b91c1c] hover:from-[#ef4444] hover:to-[#dc2626] disabled:opacity-30 disabled:cursor-not-allowed
          border border-[#dc262660] rounded-2xl text-white font-semibold text-[15px]
          transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer
          btn-glow shadow-[0_0_20px_#dc262625,0_4px_12px_#00000040]"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="tracking-wide">Digging the grave...</span>
          </>
        ) : (
          <>
            {/* Shield break icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span className="tracking-wide">Generate Obituary</span>
          </>
        )}
      </motion.button>

      <p className="text-center text-[11px] text-[#636370] mt-4 flex items-center justify-center gap-1.5 tracking-wide">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        We never store or transmit your password
      </p>
    </form>
  );
}
