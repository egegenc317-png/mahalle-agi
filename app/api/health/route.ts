import { NextResponse } from "next/server";

import { db } from "@/lib/prisma-client";
import { checkStorageHealth } from "@/lib/storage";

async function checkDatabase() {
  const dbClient = db as unknown as { $queryRawUnsafe: (query: string) => Promise<unknown> };
  await dbClient.$queryRawUnsafe("SELECT 1");
  return { provider: process.env.DB_PROVIDER || "sqlite" };
}

async function checkRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { provider: "memory-or-db-fallback", configured: false };
  }

  const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Redis health check failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { result?: string };
  return { provider: "upstash", configured: true, result: payload.result || "UNKNOWN" };
}

export async function GET() {
  const startedAt = Date.now();

  try {
    const [database, redis, storage] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkStorageHealth()
    ]);

    return NextResponse.json({
      ok: true,
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        database,
        redis,
        storage
      },
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed",
        durationMs: Date.now() - startedAt
      },
      { status: 503 }
    );
  }
}
