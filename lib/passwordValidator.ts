/**
 * Sophisticated password input validator.
 *
 * Determines whether a given string looks like a password (or passphrase)
 * vs. natural-language text, a question, a URL, a command, etc.
 *
 * Returns a result object with `valid` boolean and a `reason` message.
 */

export interface PasswordValidation {
  valid: boolean;
  reason: string;
}

// ── Precompiled patterns ──

/** Sentence-like: 4+ words with mostly lowercase alpha, typical of prose */
const SENTENCE_RE =
  /^[A-Z]?[a-z]+\s[a-z]+\s[a-z]+\s[a-z]+(\s[a-z]+)*[.!?]?$/;

/** Questions */
const QUESTION_RE =
  /^(what|who|where|when|why|how|is|are|can|do|does|did|will|would|should|could|which|tell|explain|describe|give|show|help|please|hey|hi|hello)\b/i;

/** Common greetings / chat */
const CHAT_RE =
  /^(hi|hello|hey|yo|sup|good morning|good evening|good night|thanks|thank you|please help|ok|okay)\b/i;

/** Email address */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Full URL or bare domain (e.g. google.com, sub.domain.co.uk/path) */
const URL_RE = /^(https?:\/\/|ftp:\/\/|www\.)/i;
const BARE_DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.(com|org|net|io|dev|co|app|ai|edu|gov|mil|info|biz|me|us|uk|in|de|fr|jp|cn|au|ca|ru|br|it|nl|se|no|fi|es|pt|pl|cz|ch|at|be|za|nz|kr|tw|sg|hk|my|ph|id|vn|th|ar|mx|cl|co\.uk|co\.in|co\.jp|com\.au|com\.br|ac\.in|org\.uk|net\.au)(\/\S*)?$/i;

/** Shell/code command */
const COMMAND_RE =
  /^(sudo |npm |npx |yarn |pip |git |cd |ls |mkdir |rm |curl |wget |docker |echo |cat |python |node |deno )/i;

/** Looks like a file path */
const PATH_RE = /^([A-Z]:\\|\/[a-z]|~\/)/i;

/** Only whitespace */
const BLANK_RE = /^\s*$/;

/**
 * Count natural-language "words" (alpha-only tokens ≥ 2 chars).
 * High counts suggest prose, not a password.
 */
function naturalWordCount(text: string): number {
  const words = text.split(/\s+/).filter((w) => /^[a-zA-Z]{2,}$/.test(w));
  return words.length;
}

/**
 * Ratio of space characters to total length.
 * Passwords rarely have many spaces; prose does.
 */
function spaceRatio(text: string): number {
  if (text.length === 0) return 0;
  return (text.match(/ /g) || []).length / text.length;
}

/**
 * Check if the string has "password entropy signals" —
 * mixed character classes (upper, lower, digits, symbols).
 */
function charClassCount(text: string): number {
  let classes = 0;
  if (/[a-z]/.test(text)) classes++;
  if (/[A-Z]/.test(text)) classes++;
  if (/\d/.test(text)) classes++;
  if (/[^a-zA-Z0-9\s]/.test(text)) classes++;
  return classes;
}

/**
 * Validate whether the input looks like a password.
 */
export function validatePasswordInput(input: string): PasswordValidation {
  const trimmed = input.trim();

  // ── Empty / blank ──
  if (!trimmed || BLANK_RE.test(trimmed)) {
    return { valid: false, reason: "Enter a password to analyze" };
  }

  // ── Too short ──
  if (trimmed.length < 1) {
    return { valid: false, reason: "Password is too short" };
  }

  // ── Too long (>128 chars is almost certainly not a password) ──
  if (trimmed.length > 128) {
    return { valid: false, reason: "Input exceeds maximum password length (128 chars)" };
  }

  // ── Email ──
  if (EMAIL_RE.test(trimmed)) {
    return { valid: false, reason: "That looks like an email address, not a password" };
  }

  // ── URL ──
  if (URL_RE.test(trimmed)) {
    return { valid: false, reason: "That looks like a URL, not a password" };
  }

  // ── Bare domain (e.g. google.com, github.io) ──
  if (BARE_DOMAIN_RE.test(trimmed)) {
    return { valid: false, reason: "That looks like a website address, not a password" };
  }

  // ── File path ──
  if (PATH_RE.test(trimmed)) {
    return { valid: false, reason: "That looks like a file path, not a password" };
  }

  // ── Shell command ──
  if (COMMAND_RE.test(trimmed)) {
    return { valid: false, reason: "That looks like a command, not a password" };
  }

  // ── Greeting / chat ──
  if (CHAT_RE.test(trimmed) && naturalWordCount(trimmed) <= 5) {
    return { valid: false, reason: "That looks like a greeting, not a password" };
  }

  // ── Question ──
  if (QUESTION_RE.test(trimmed) && (trimmed.includes("?") || naturalWordCount(trimmed) >= 4)) {
    return { valid: false, reason: "That looks like a question, not a password" };
  }

  // ── Pure prose / sentence detection ──
  // A passphrase like "correct horse battery staple" IS valid (3-5 words, no punctuation end).
  // But a full sentence with 6+ natural words and low character diversity is likely prose.
  const nwc = naturalWordCount(trimmed);
  const sr = spaceRatio(trimmed);
  const cc = charClassCount(trimmed);

  if (nwc >= 6 && sr > 0.12 && cc <= 2) {
    // Looks like a natural-language sentence
    return {
      valid: false,
      reason: "That looks like a sentence. Enter a password or passphrase instead",
    };
  }

  // Sentences that match classic structure
  if (SENTENCE_RE.test(trimmed) && nwc >= 5) {
    return {
      valid: false,
      reason: "That looks like a sentence, not a password",
    };
  }

  // ── Very high space ratio with many words → likely prose ──
  if (nwc >= 8 && sr > 0.15) {
    return {
      valid: false,
      reason: "Input is too long for a password. Enter a password or short passphrase",
    };
  }

  // ── All checks passed → treat as a valid password ──
  return { valid: true, reason: "" };
}
