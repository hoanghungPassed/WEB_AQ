const ipCache = new Map<string, { count: number; resetTime: number }>();

/**
 * Basic in-memory rate limiter using Map (optimized for serverless deployments)
 */
export async function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const cached = ipCache.get(ip);

  if (!cached) {
    const resetTime = now + windowMs;
    ipCache.set(ip, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (now > cached.resetTime) {
    const resetTime = now + windowMs;
    ipCache.set(ip, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  cached.count += 1;
  if (cached.count > limit) {
    return { success: false, remaining: 0, resetTime: cached.resetTime };
  }

  return { success: true, remaining: limit - cached.count, resetTime: cached.resetTime };
}

export const twoFARateLimiter = null as any;
