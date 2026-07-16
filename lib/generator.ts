/**
 * Cryptographically-strong, fully-local password & passphrase generator.
 *
 * Uses the Web Crypto API (`crypto.getRandomValues`), which is available in
 * both the browser and the Next.js server runtime — so this module works on
 * the client (the Generator tool) and the server (password reincarnation)
 * with no dependencies and no external calls.
 *
 * Generating passwords locally with a CSPRNG is strictly better than asking a
 * language model to invent one: the entropy is real, uniform, and never
 * leaves the device.
 */

const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l, o (ambiguous)
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
const NUMBERS = "23456789"; // no 0, 1
const SYMBOLS = "!@#$%^&*-_=+?";

/**
 * Resolve the Web Crypto object at call time. It is present as `globalThis.crypto`
 * in every modern browser and in Node 20+ (the runtime Next.js 16 targets).
 */
function getCrypto(): Crypto {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("Secure random number generator is unavailable in this environment.");
  }
  return c;
}

/** Uniform random integer in [0, max) using rejection sampling (no modulo bias). */
export function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    getCrypto().getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function randomChar(charset: string): string {
  return charset[secureRandomInt(charset.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

/**
 * Generate a random password. Guarantees at least one character from every
 * selected class, then fills the remainder from the combined pool and
 * shuffles so the guaranteed characters are not positionally predictable.
 */
export function generatePassword(opts: GeneratorOptions): string {
  const pools: string[] = [];
  if (opts.lowercase) pools.push(LOWER);
  if (opts.uppercase) pools.push(UPPER);
  if (opts.numbers) pools.push(NUMBERS);
  if (opts.symbols) pools.push(SYMBOLS);

  // Fallback: never produce an empty password.
  if (pools.length === 0) pools.push(LOWER);

  const length = Math.max(pools.length, Math.min(64, Math.round(opts.length)));
  const combined = pools.join("");

  const chars: string[] = pools.map((p) => randomChar(p)); // one guaranteed from each
  while (chars.length < length) {
    chars.push(randomChar(combined));
  }
  return shuffle(chars).join("");
}

/* ── Passphrase word list (EFF-style short, memorable, non-trivial) ── */
const WORDS = [
  "amber", "anchor", "aurora", "badge", "bamboo", "banjo", "beacon", "bishop",
  "bison", "blaze", "bolt", "bonsai", "boulder", "bramble", "bronze", "cactus",
  "canyon", "cargo", "cedar", "cinder", "cipher", "citadel", "cobalt", "comet",
  "compass", "copper", "coral", "cosmic", "crimson", "crystal", "cyclone", "dagger",
  "dawn", "delta", "diamond", "dragon", "dusk", "eagle", "ember", "engine",
  "falcon", "fathom", "feather", "fjord", "flint", "forest", "fossil", "galaxy",
  "gambit", "garnet", "geyser", "glacier", "granite", "griffin", "harbor", "hazel",
  "helix", "hollow", "hornet", "ignite", "indigo", "ingot", "iris", "ivory",
  "jaguar", "jasper", "jetty", "jubilee", "kernel", "kestrel", "koala", "lagoon",
  "lantern", "legend", "lichen", "lotus", "lumber", "lunar", "maple", "marble",
  "marlin", "meadow", "meteor", "mirage", "mongoose", "monsoon", "mosaic", "nebula",
  "nectar", "nimbus", "nomad", "oasis", "obsidian", "onyx", "orbit", "otter",
  "outpost", "oxide", "panther", "pebble", "phantom", "phoenix", "pigment", "pillar",
  "plasma", "prairie", "prism", "quartz", "quiver", "radar", "rapids", "raven",
  "reef", "relic", "ripple", "rocket", "rooster", "rune", "saffron", "sable",
  "sapphire", "scarlet", "scepter", "sequoia", "shadow", "sierra", "signal", "silver",
  "sizzle", "socket", "solar", "sonar", "spark", "spire", "sprocket", "static",
  "stellar", "summit", "talon", "tandem", "tempest", "thistle", "thunder", "timber",
  "titan", "topaz", "torch", "totem", "tundra", "turbine", "umbra", "vandal",
  "velvet", "vertex", "vortex", "walrus", "warden", "willow", "wizard", "wombat",
  "yonder", "zenith", "zephyr", "zodiac",
];

export interface PassphraseOptions {
  words: number;
  separator: string;
  capitalize: boolean;
  includeNumber: boolean;
}

/** Generate a memorable passphrase, e.g. "Cobalt-Meteor-Willow-47". */
export function generatePassphrase(opts: PassphraseOptions): string {
  const count = Math.max(2, Math.min(10, Math.round(opts.words)));
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    let w = WORDS[secureRandomInt(WORDS.length)];
    if (opts.capitalize) w = w[0].toUpperCase() + w.slice(1);
    parts.push(w);
  }
  let phrase = parts.join(opts.separator);
  if (opts.includeNumber) {
    phrase += opts.separator + (10 + secureRandomInt(90)).toString();
  }
  return phrase;
}

/* ── Themed reincarnation ── */

const LEET: Record<string, string> = {
  a: "4", e: "3", i: "1", o: "0", s: "5", t: "7", b: "8", g: "9",
};

function leetify(word: string): string {
  return word
    .split("")
    .map((ch) => (Math.random() < 0.5 && LEET[ch.toLowerCase()] ? LEET[ch.toLowerCase()] : ch))
    .join("");
}

/**
 * Reincarnate a dead password into a strong one that keeps a theme alive.
 * Produces a cryptographically-strong password (>= minLength, all four
 * character classes) that visibly nods to `theme`, plus a short explanation.
 */
export function generateThemedPassword(
  rawTheme: string,
  minLength = 16
): { password: string; explanation: string } {
  // Extract a clean alphabetic seed word from the detected theme string,
  // e.g. "animal (dragon)" -> "dragon".
  const match = rawTheme.match(/\(([^)]+)\)/);
  const candidate = (match ? match[1] : rawTheme).replace(/[^a-zA-Z]/g, "");
  let seed = candidate.length >= 3 ? candidate : WORDS[secureRandomInt(WORDS.length)];
  seed = seed.slice(0, 12);
  seed = seed[0].toUpperCase() + seed.slice(1).toLowerCase();

  const themed = leetify(seed);
  const sep = randomChar(SYMBOLS);

  // Assemble: themed core + separator + strong random tail, guaranteeing all
  // classes and the requested length.
  const targetLen = Math.max(minLength, 16);
  const tailLen = Math.max(6, targetLen - themed.length - 1);
  const tail = generatePassword({
    length: tailLen,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  let password = `${themed}${sep}${tail}`;

  // Guarantee character-class coverage even if the themed core is all letters.
  if (!/[A-Z]/.test(password)) password += UPPER[secureRandomInt(UPPER.length)];
  if (!/[a-z]/.test(password)) password += LOWER[secureRandomInt(LOWER.length)];
  if (!/[0-9]/.test(password)) password += NUMBERS[secureRandomInt(NUMBERS.length)];
  if (!/[^a-zA-Z0-9]/.test(password)) password += SYMBOLS[secureRandomInt(SYMBOLS.length)];

  const explanation = `"${seed}" theme reforged with leet-speak, a random ${tailLen}-character crypto tail, and all four character classes — generated locally with a secure RNG.`;

  return { password, explanation };
}
