/**
 * Browser-side breach check using HIBP's Pwned Passwords range API with
 * k-anonymity.
 *
 * This is the core of DeadCredentials' trust model: the SHA-1 hash is computed
 * IN THE BROWSER with the Web Crypto API, and only the first 5 characters of
 * that hash are ever sent over the network — directly from the user's browser
 * to api.pwnedpasswords.com, never through our server. The raw password and
 * the remaining 35 hash characters never leave the device.
 *
 * HIBP's range endpoint returns `Access-Control-Allow-Origin: *`, so it is
 * designed to be called this way. Anyone can verify the behaviour in their
 * browser's Network tab.
 */

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";

export interface BreachResult {
  breachCount: number;
  /** The 5-char SHA-1 prefix that was sent to HIBP (for the transparency UI). */
  hashPrefix: string;
  /** Full SHA-1 length minus the 5 sent chars — proof of what stayed local. */
  suffixLengthKeptLocal: number;
}

/** Compute the uppercase hex SHA-1 of a string in the browser. */
async function sha1Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/**
 * Check a password against HIBP. Throws on network failure so callers can
 * decide how to degrade (analysis still works without the breach count).
 */
export async function checkPasswordBreach(password: string): Promise<BreachResult> {
  const sha1 = await sha1Hex(password);
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
    method: "GET",
    // No credentials, no custom headers → simple CORS request, no preflight.
    headers: { Accept: "text/plain" },
  });

  if (!res.ok) {
    throw new Error(`HIBP returned ${res.status}`);
  }

  const text = await res.text();
  let breachCount = 0;
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    if (line.slice(0, idx) === suffix) {
      breachCount = parseInt(line.slice(idx + 1), 10) || 0;
      break;
    }
  }

  return { breachCount, hashPrefix: prefix, suffixLengthKeptLocal: suffix.length };
}
