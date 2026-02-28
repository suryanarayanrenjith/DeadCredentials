// Common weak passwords list (top 100 most common)
const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
  "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
  "ashley", "bailey", "shadow", "123123", "654321", "superman", "qazwsx",
  "michael", "football", "password1", "password123", "batman", "login",
  "welcome", "hello", "charlie", "donald", "admin", "qwerty123", "passw0rd",
  "starwars", "princess", "cheese", "121212", "flower", "hottie", "loveme",
  "zaq1zaq1", "111111", "1234", "12345", "1q2w3e4r", "123456789", "000000",
  "azerty", "access", "test", "love", "god", "buster", "killer", "jordan",
  "jennifer", "hunter", "amanda", "jessica", "harley", "ranger", "thomas",
  "robert", "soccer", "hockey", "george", "andrew", "michelle", "daniel",
  "taylor", "apple", "pepper", "ginger", "joshua", "summer", "chicken",
  "compaq", "corvette", "mercedes", "maverick", "cookie", "samantha", "secret",
  "1234567890", "qwerty1", "computer", "internet", "whatever", "696969",
  "matrix", "mustang", "yankees", "cheese1", "camaro", "blahblah",
]);

// Common patterns
const KEYBOARD_PATTERNS = [
  "qwerty", "asdf", "zxcv", "1234", "0987", "qazwsx", "1q2w3e",
  "!@#$%", "abcdef", "asdfjkl",
];

const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "!": "i",
};

export interface PasswordCharacteristics {
  length: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSymbols: boolean;
  isCommon: boolean;
  hasKeyboardPattern: boolean;
  hasRepeatingChars: boolean;
  hasSequentialNumbers: boolean;
  estimatedCrackTime: string;
  strengthScore: number; // 0–100
  deathCause: string;
  patterns: string[];
}

function deLeet(password: string): string {
  return password
    .split("")
    .map((c) => LEET_MAP[c] || c)
    .join("")
    .toLowerCase();
}

function hasRepeatingChars(password: string): boolean {
  return /(.)\1{2,}/.test(password);
}

function hasSequentialNumbers(password: string): boolean {
  for (let i = 0; i < password.length - 2; i++) {
    const a = parseInt(password[i]);
    const b = parseInt(password[i + 1]);
    const c = parseInt(password[i + 2]);
    if (!isNaN(a) && !isNaN(b) && !isNaN(c)) {
      if ((b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) {
        return true;
      }
    }
  }
  return false;
}

function hasKeyboardPattern(password: string): boolean {
  const lower = password.toLowerCase();
  return KEYBOARD_PATTERNS.some((p) => lower.includes(p));
}

function estimateCrackTime(password: string, characteristics: Partial<PasswordCharacteristics>): string {
  const len = password.length;
  let charsetSize = 0;
  if (characteristics.hasLowercase) charsetSize += 26;
  if (characteristics.hasUppercase) charsetSize += 26;
  if (characteristics.hasNumbers) charsetSize += 10;
  if (characteristics.hasSymbols) charsetSize += 33;
  if (charsetSize === 0) charsetSize = 26;

  // Rough brute-force estimate at 10 billion attempts/sec
  const combinations = Math.pow(charsetSize, len);
  const seconds = combinations / 10_000_000_000;

  if (characteristics.isCommon) return "instantly (common password)";
  if (seconds < 1) return "less than a second";
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.ceil(seconds / 3600)} hours`;
  if (seconds < 86400 * 365) return `${Math.ceil(seconds / 86400)} days`;
  if (seconds < 86400 * 365 * 1000) return `${Math.ceil(seconds / (86400 * 365))} years`;
  if (seconds < 86400 * 365 * 1_000_000) return `${Math.ceil(seconds / (86400 * 365 * 1000))} thousand years`;
  return "millions of years";
}

function calculateStrength(password: string, chars: Partial<PasswordCharacteristics>): number {
  let score = 0;

  // Length scoring
  score += Math.min(password.length * 4, 40);

  // Character variety
  if (chars.hasLowercase) score += 5;
  if (chars.hasUppercase) score += 10;
  if (chars.hasNumbers) score += 10;
  if (chars.hasSymbols) score += 15;

  // Penalties
  if (chars.isCommon) score -= 40;
  if (chars.hasKeyboardPattern) score -= 15;
  if (chars.hasRepeatingChars) score -= 10;
  if (chars.hasSequentialNumbers) score -= 10;
  if (password.length < 6) score -= 20;

  // Mix bonus
  const typesUsed = [chars.hasLowercase, chars.hasUppercase, chars.hasNumbers, chars.hasSymbols].filter(Boolean).length;
  if (typesUsed >= 3) score += 10;
  if (typesUsed === 4) score += 10;

  return Math.max(0, Math.min(100, score));
}

function determineDeathCause(chars: Partial<PasswordCharacteristics>, breachCount?: number): string {
  if (chars.isCommon) return "dictionary attack";
  if (breachCount && breachCount > 1000) return "credential stuffing";
  if ((chars.hasKeyboardPattern || chars.hasSequentialNumbers) && !chars.hasSymbols) return "pattern-based attack";
  const len = chars.length || 0;
  if (len <= 6) return "brute force";
  if (len <= 8 && !chars.hasSymbols && !chars.hasUppercase) return "brute force";
  if (breachCount && breachCount > 0) return "credential stuffing";
  return "social engineering";
}

function detectPatterns(password: string): string[] {
  const patterns: string[] = [];
  const lower = password.toLowerCase();

  if (COMMON_PASSWORDS.has(lower)) patterns.push("common password");
  if (deLeet(password) !== lower && COMMON_PASSWORDS.has(deLeet(password)))
    patterns.push("leet-speak substitution of a common password");
  if (hasKeyboardPattern(password)) patterns.push("keyboard pattern");
  if (hasRepeatingChars(password)) patterns.push("repeating characters");
  if (hasSequentialNumbers(password)) patterns.push("sequential numbers");
  if (/^\d+$/.test(password)) patterns.push("numbers only");
  if (/^[a-zA-Z]+$/.test(password)) patterns.push("letters only");
  if (password.length <= 4) patterns.push("extremely short");
  else if (password.length <= 6) patterns.push("very short");
  if (/^[A-Z][a-z]+\d+$/.test(password)) patterns.push("name + numbers pattern");
  if (/^[a-z]+\d{1,4}$/.test(password)) patterns.push("word + short number suffix");
  if (/19[5-9]\d|20[0-2]\d/.test(password)) patterns.push("contains a year");

  return patterns;
}

export function analyzePassword(password: string): PasswordCharacteristics {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSym = /[^a-zA-Z0-9]/.test(password);
  const isCommon = COMMON_PASSWORDS.has(password.toLowerCase()) ||
    COMMON_PASSWORDS.has(deLeet(password));

  const partial: Partial<PasswordCharacteristics> = {
    length: password.length,
    hasUppercase: hasUpper,
    hasLowercase: hasLower,
    hasNumbers: hasNum,
    hasSymbols: hasSym,
    isCommon,
    hasKeyboardPattern: hasKeyboardPattern(password),
    hasRepeatingChars: hasRepeatingChars(password),
    hasSequentialNumbers: hasSequentialNumbers(password),
  };

  const strength = calculateStrength(password, partial);
  const crackTime = estimateCrackTime(password, partial);
  const deathCause = determineDeathCause(partial);
  const patterns = detectPatterns(password);

  return {
    ...partial,
    strengthScore: strength,
    estimatedCrackTime: crackTime,
    deathCause,
    patterns,
  } as PasswordCharacteristics;
}

export function formatCharacteristicsForPrompt(chars: PasswordCharacteristics): string {
  const parts: string[] = [];
  parts.push(`Length: ${chars.length} characters`);
  parts.push(`Contains: ${[
    chars.hasLowercase && "lowercase",
    chars.hasUppercase && "uppercase",
    chars.hasNumbers && "numbers",
    chars.hasSymbols && "symbols",
  ].filter(Boolean).join(", ") || "unknown"}`);
  parts.push(`Strength score: ${chars.strengthScore}/100`);
  parts.push(`Estimated crack time: ${chars.estimatedCrackTime}`);
  if (chars.patterns.length > 0) parts.push(`Patterns detected: ${chars.patterns.join(", ")}`);
  return parts.join("\n");
}

/** Segment-level DNA analysis — rates each character for strength/weakness */
export interface DNASegment {
  char: string;      // display char (masked with * for middle chars)
  strength: number;  // 0-3 (0=very weak, 1=weak, 2=medium, 3=strong)
  reason: string;    // tooltip explanation
}

export function analyzePasswordDNA(password: string): DNASegment[] {
  const KEYBOARD_ROW_1 = "qwertyuiop";
  const KEYBOARD_ROW_2 = "asdfghjkl";
  const KEYBOARD_ROW_3 = "zxcvbnm";
  const KEYBOARDS = [KEYBOARD_ROW_1, KEYBOARD_ROW_2, KEYBOARD_ROW_3, "1234567890"];

  const lower = password.toLowerCase();
  const segments: DNASegment[] = [];

  for (let i = 0; i < password.length; i++) {
    const c = password[i];
    let strength = 2; // default: medium
    let reason = "acceptable character";

    // Check if part of a keyboard run (3+ consecutive on same row)
    for (const row of KEYBOARDS) {
      if (i >= 2) {
        const sub = lower.slice(i - 2, i + 1);
        const idx = row.indexOf(sub);
        if (idx !== -1) {
          strength = 0;
          reason = "keyboard pattern sequence";
          break;
        }
        // reverse
        const rev = sub.split("").reverse().join("");
        if (row.indexOf(rev) !== -1) {
          strength = 0;
          reason = "reversed keyboard pattern";
          break;
        }
      }
    }

    // Sequential numbers
    if (i >= 2) {
      const a = parseInt(password[i - 2]);
      const b = parseInt(password[i - 1]);
      const cv = parseInt(c);
      if (!isNaN(a) && !isNaN(b) && !isNaN(cv)) {
        if ((b === a + 1 && cv === b + 1) || (b === a - 1 && cv === b - 1)) {
          strength = 0;
          reason = "sequential number run";
        }
      }
    }

    // Repeating chars
    if (i >= 2 && password[i] === password[i - 1] && password[i - 1] === password[i - 2]) {
      strength = 0;
      reason = "repeating character";
    } else if (i >= 1 && password[i] === password[i - 1] && strength > 0) {
      strength = Math.min(strength, 1);
      reason = "repeated character";
    }

    // Character type scoring
    if (strength >= 2) {
      if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(c)) {
        strength = 3;
        reason = "special character — excellent";
      } else if (/[A-Z]/.test(c) && /[a-z]/.test(password)) {
        strength = 3;
        reason = "mixed case — strong";
      } else if (/[0-9]/.test(c) && /[a-zA-Z]/.test(password)) {
        strength = 2;
        reason = "number mixed with letters";
      } else if (/[a-z]/.test(c)) {
        strength = 1;
        reason = "lowercase letter only";
      } else if (/[0-9]/.test(c)) {
        strength = 1;
        reason = "digit only";
      }
    }

    // Mask middle chars for display
    const isShowChar = i < 2 || i >= password.length - 2 || password.length <= 5;
    segments.push({
      char: isShowChar ? c : "*",
      strength,
      reason,
    });
  }

  return segments;
}
