/**
 * Sliding-window rate limiter for the AI route (server only).
 *
 * Configure with environment variables in `client/.env.local`:
 * - `AI_RATE_LIMIT_MAX`: questions allowed per window (default 10). Set to 0 to turn the limit off.
 * - `AI_RATE_LIMIT_WINDOW_SECONDS`: window length (default 60).
 *
 * Hits are kept in memory, so the limit is per server process and resets on restart.
 */

export type RateLimitConfig = {
  /** Requests allowed per window; 0 means unlimited. */
  max: number;
  windowMs: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const DEFAULT_MAX = 0;
const DEFAULT_WINDOW_SECONDS = 5;
/** Sweep idle keys once the table grows past this many. */
const SWEEP_AT = 1_000;

// Held on globalThis so dev-mode module reloads don't hand out a fresh allowance.
const store = globalThis as typeof globalThis & { __helpityRateHits?: Map<string, number[]> };
const hits = (store.__helpityRateHits ??= new Map<string, number[]>());

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return value?.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function readRateLimitConfig(env: NodeJS.ProcessEnv = process.env): RateLimitConfig {
  const seconds = readNumber(env.AI_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS);
  return {
    max: Math.floor(readNumber(env.AI_RATE_LIMIT_MAX, DEFAULT_MAX)),
    windowMs: (seconds || DEFAULT_WINDOW_SECONDS) * 1000,
  };
}

/** Records a request for `key` and says whether it fits within the limit. */
export function checkRateLimit(
  key: string,
  { max, windowMs }: RateLimitConfig,
  now = Date.now(),
): RateLimitResult {
  if (max === 0) return { allowed: true };

  if (hits.size > SWEEP_AT) {
    for (const [other, times] of hits) {
      if (times[times.length - 1] <= now - windowMs) hits.delete(other);
    }
  }

  const recent = (hits.get(key) ?? []).filter((time) => time > now - windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil((recent[0] + windowMs - now) / 1000) };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true };
}
