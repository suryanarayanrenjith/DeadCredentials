/**
 * Small, dependency-free helpers safe to run in the browser.
 *
 * Kept separate from lib/apiUtils.ts so client bundles never pull in the
 * server-only rate limiter (and its timers).
 */

/** Mask a password for display, e.g. "correcthorse" -> "co******se". */
export function maskPassword(password: string): string {
  if (password.length <= 2) return "*".repeat(password.length);
  if (password.length <= 4) return password[0] + "*".repeat(password.length - 1);
  const first = password.slice(0, 2);
  const last = password.slice(-2);
  const middle = "*".repeat(Math.min(password.length - 4, 6));
  return first + middle + last;
}
