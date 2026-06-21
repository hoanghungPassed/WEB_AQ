import mongoose, { Schema } from "mongoose";
import dbConnect from "@/lib/mongodb";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Global cache persisting in Node runtime (fallback for connection issues)
const cache = new Map<string, RateLimitRecord>();

// Define Mongoose Schema for persistent rate limits
let RateLimitModel: any;
try {
  const RateLimitSchema = new Schema({
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 1 },
    resetAt: { type: Date, required: true }
  });
  // Auto-delete documents when resetAt time is reached
  RateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });
  RateLimitModel = mongoose.models.RateLimit || mongoose.model("RateLimit", RateLimitSchema, "rate_limits");
} catch (e) {
  RateLimitModel = mongoose.models.RateLimit;
}

/**
 * MongoDB-backed Rate limiting utility with memory fallback
 * @param ip Client IP Address
 * @param limit Max allowed requests within windowMs
 * @param windowMs Time window in milliseconds (e.g. 60000 for 1 minute)
 */
export async function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const key = `rl_${ip}`;
  const resetAt = new Date(now + windowMs);

  try {
    // Ensure database connection
    await dbConnect();

    let record = await RateLimitModel.findOne({ key });

    if (!record) {
      try {
        record = await RateLimitModel.create({ key, count: 1, resetAt });
      } catch (dupErr) {
        // Handle concurrent insert collisions
        record = await RateLimitModel.findOne({ key });
      }
    }

    if (record) {
      if (now > record.resetAt.getTime()) {
        record.count = 1;
        record.resetAt = resetAt;
        await record.save();
      } else if (record.count >= limit) {
        return { success: false, remaining: 0, resetTime: record.resetAt.getTime() };
      } else {
        record.count += 1;
        await record.save();
      }
      return { success: true, remaining: Math.max(0, limit - record.count), resetTime: record.resetAt.getTime() };
    }
  } catch (dbErr) {
    console.error("Rate limiter DB error, falling back to memory:", dbErr);
  }

  // Fallback: Memory-based rate limiting
  if (cache.size > 1000) {
    for (const [k, r] of cache.entries()) {
      if (now > r.resetTime) {
        cache.delete(k);
      }
    }
  }

  const memRecord = cache.get(ip);

  if (!memRecord) {
    const resetTime = now + windowMs;
    cache.set(ip, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (now > memRecord.resetTime) {
    memRecord.count = 1;
    memRecord.resetTime = now + windowMs;
    return { success: true, remaining: limit - 1, resetTime: memRecord.resetTime };
  }

  if (memRecord.count >= limit) {
    return { success: false, remaining: 0, resetTime: memRecord.resetTime };
  }

  memRecord.count += 1;
  return { success: true, remaining: limit - memRecord.count, resetTime: memRecord.resetTime };
}
