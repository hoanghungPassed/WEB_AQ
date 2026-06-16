interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Global cache persisting in Node runtime
const cache = new Map<string, RateLimitRecord>();

/**
 * Basic rate-limiting utility
 * @param ip Client IP Address
 * @param limit Max allowed requests within windowMs
 * @param windowMs Time window in milliseconds (e.g. 60000 for 1 minute)
 */
export function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  // Lazy clean-up of expired cache entries to prevent memory growth
  if (cache.size > 1000) {
    for (const [key, record] of cache.entries()) {
      if (now > record.resetTime) {
        cache.delete(key);
      }
    }
  }

  const record = cache.get(ip);

  if (!record) {
    const resetTime = now + windowMs;
    cache.set(ip, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return { success: true, remaining: limit - 1, resetTime: record.resetTime };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count, resetTime: record.resetTime };
}
