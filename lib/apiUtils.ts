/**
 * Shared in-memory rate limiter with automatic cleanup.
 *
 * Note: In serverless environments (Vercel), each cold start gets a fresh
 * instance, making this best-effort. For production, consider Redis/Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const CLEANUP_INTERVAL = 60_000; // Sweep expired entries every 60s

class RateLimiter {
  private map = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.startCleanup();
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const entry = this.map.get(key);

    if (!entry || now > entry.resetTime) {
      this.map.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    entry.count++;
    return entry.count > this.limit;
  }

  private startCleanup() {
    // Only set up one interval per instance
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.map) {
        if (now > entry.resetTime) {
          this.map.delete(key);
        }
      }
    }, CLEANUP_INTERVAL);

    // Allow the process to exit even if this timer is running
    if (typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }
}

/** Rate limiter for password check API: 10 requests per 60s */
export const checkPasswordLimiter = new RateLimiter(10, 60_000);

/** Rate limiter for reincarnation API: 10 requests per 60s */
export const reincarnationLimiter = new RateLimiter(10, 60_000);

/** Extract client IP from request headers */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/** Validate request origin for basic CSRF protection */
export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Allow requests with no origin (same-origin, curl, etc.)
  if (!origin && !referer) return true;

  // In dev, allow localhost
  if (origin?.includes("localhost") || referer?.includes("localhost")) return true;

  // In production, check against deployed domain
  const host = request.headers.get("host") || "";
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      return originHost === host;
    } catch {
      return false;
    }
  }

  return true;
}

/** Shared password masking utility */
export function maskPassword(password: string): string {
  if (password.length <= 2) return "*".repeat(password.length);
  if (password.length <= 4) return password[0] + "*".repeat(password.length - 1);
  const first = password.slice(0, 2);
  const last = password.slice(-2);
  const middle = "*".repeat(Math.min(password.length - 4, 6));
  return first + middle + last;
}
