/**
 * Einfacher In-Memory-Limiter für Login-Versuche.
 * Reicht für einen einzelnen Server-Prozess; bei mehreren Instanzen müsste er in die DB/Redis.
 */
export type RateLimiter = {
  /** true, wenn für diesen Schlüssel noch Versuche frei sind. */
  isAllowed(key: string): boolean;
  /** Fehlversuch zählen. */
  fail(key: string): void;
  /** Nach erfolgreichem Login zurücksetzen. */
  reset(key: string): void;
};

export function createRateLimiter(
  maxAttempts: number,
  windowMs: number,
  now: () => number = Date.now
): RateLimiter {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  function current(key: string) {
    const entry = attempts.get(key);
    if (entry && entry.resetAt <= now()) {
      attempts.delete(key);
      return undefined;
    }
    return entry;
  }

  return {
    isAllowed(key) {
      const entry = current(key);
      return !entry || entry.count < maxAttempts;
    },
    fail(key) {
      const entry = current(key);
      if (entry) entry.count++;
      else attempts.set(key, { count: 1, resetAt: now() + windowMs });
    },
    reset(key) {
      attempts.delete(key);
    },
  };
}

/** 10 Fehlversuche pro 15 Minuten und Schlüssel. */
export const loginLimiter = createRateLimiter(10, 15 * 60 * 1000);
