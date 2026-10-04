import { Redis } from '@upstash/redis';

// ─── Upstash REST Client ───────────────────────────────────────────────────────
// Used by Next.js API routes for caching (post hash deduplication).
// Becomes active in Phase 5 when UPSTASH_REDIS_REST_URL is set.
export const redis =
  process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes('placeholder')
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null;

// ─── BullMQ ioredis Connection Options ────────────────────────────────────────
// Used by worker/queues.ts for BullMQ queue connections.
// Upstash provides a Redis-compatible endpoint (rediss://) for ioredis.
// Configured fully in Phase 5 when UPSTASH_REDIS_URL is set.
export const redisConnection = {
  maxRetriesPerRequest: null as null,
  ...(process.env.UPSTASH_REDIS_URL &&
  !process.env.UPSTASH_REDIS_URL.includes('placeholder')
    ? { url: process.env.UPSTASH_REDIS_URL }
    : {
        host: '127.0.0.1',
        port: 6379,
      }),
};
