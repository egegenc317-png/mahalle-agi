/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/prisma-client";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const RETENTION_MS = 1000 * 60 * 60;

let redisClient: Redis | null = null;

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) {
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

export async function checkRateLimit(key: string, options?: { windowMs?: number; maxAttempts?: number }) {
  const dbClient = db as any;
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const maxAttempts = options?.maxAttempts ?? MAX_ATTEMPTS;
  const now = Date.now();
  const retentionThreshold = BigInt(now - RETENTION_MS);

  const redis = getRedisClient();
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, Math.max(1, Math.ceil(windowMs / 1000)));
      }
      return { ok: count <= maxAttempts };
    } catch {
      // Redis geçici hata verirse DB fallback kullan.
    }
  }

  await dbClient.rateLimitEntry.deleteMany({
    where: {
      windowStart: {
        lt: retentionThreshold
      }
    }
  });

  const entry = await dbClient.rateLimitEntry.findUnique({ where: { key } });
  if (!entry || now - Number(entry.windowStart) > windowMs) {
    await dbClient.rateLimitEntry.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        windowStart: BigInt(now)
      },
      update: {
        count: 1,
        windowStart: BigInt(now)
      }
    });
    return { ok: true };
  }

  if (entry.count >= maxAttempts) {
    return { ok: false };
  }

  await dbClient.rateLimitEntry.update({
    where: { key },
    data: {
      count: {
        increment: 1
      }
    }
  });

  return { ok: true };
}
