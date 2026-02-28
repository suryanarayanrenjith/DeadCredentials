import crypto from "crypto";

export interface HIBPResult {
  breachCount: number;
  sha1Hash: string;
}

/**
 * Check a password against the HIBP Pwned Passwords API
 * using k-anonymity (only first 5 chars of SHA-1 sent).
 * The full password/hash is NEVER transmitted.
 */
export async function checkPasswordBreach(password: string): Promise<HIBPResult> {
  // SHA-1 hash the password
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);

  // Query HIBP with only the prefix (k-anonymity)
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: {
      "User-Agent": "DeadCredentials-PasswordObituaryGenerator",
    },
  });

  if (!response.ok) {
    throw new Error(`HIBP API returned ${response.status}`);
  }

  const text = await response.text();

  // Parse response: each line is "SUFFIX:COUNT"
  const lines = text.split(/\r?\n/);
  let breachCount = 0;

  for (const line of lines) {
    const [hashSuffix, count] = line.split(":");
    if (hashSuffix === suffix) {
      breachCount = parseInt(count, 10);
      break;
    }
  }

  return { breachCount, sha1Hash: sha1 };
}
