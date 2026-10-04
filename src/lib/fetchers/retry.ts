import axios, { AxiosError } from 'axios';
import { sleep } from '../utils';
import { prisma } from '../prisma';
import { env } from '../env';
import type { RawPost } from '../../types';

// ─── Retry wrapper ────────────────────────────────────────────────────────────
// Wraps any async function with up to `maxAttempts` retries using exponential
// backoff. Bails immediately on 4xx errors except 429 (rate-limit).
export async function retryFetch<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (err instanceof AxiosError) {
        const status = err.response?.status ?? 0;
        if (status >= 400 && status < 500 && status !== 429) {
          throw err;
        }
        if (status === 429) {
          const retryAfter = Number(err.response?.headers?.['retry-after'] ?? 10);
          console.warn(`[retryFetch] rate-limited (429). Waiting ${retryAfter}s...`);
          await sleep(retryAfter * 1000);
          continue;
        }
      }

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(
          `[retryFetch] attempt ${attempt}/${maxAttempts} failed: ${(err as Error).message}. Retrying in ${delay}ms…`,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ─── Shared Axios instance for RapidAPI ─────────────────────────────────────
export function rapidApiClient(host: string) {
  return axios.create({
    baseURL: `https://${host}`,
    timeout: 15_000,
    headers: {
      'x-rapidapi-key': env.RAPIDAPI_KEY ?? '',
      'x-rapidapi-host': host,
    },
  });
}

// ─── Upsert posts to DB ──────────────────────────────────────────────────────
// Uses createMany + skipDuplicates for bulk insert.
// Returns fetched count, stored (new) count, and the DB IDs of new rows so
// callers can immediately score only the fresh posts.
export async function upsertPosts(
  posts: RawPost[],
): Promise<{ fetched: number; stored: number; newIds: string[] }> {
  if (posts.length === 0) return { fetched: 0, stored: 0, newIds: [] };

  const externalIds = posts.map((p) => p.externalId);

  // Identify which externalIds already exist before the insert
  const existing = await prisma.post.findMany({
    where:  { externalId: { in: externalIds } },
    select: { externalId: true },
  });
  const existingSet     = new Set(existing.map((p) => p.externalId));
  const novelExternalIds = externalIds.filter((id) => !existingSet.has(id));

  const result = await prisma.post.createMany({
    data: posts.map((p) => ({
      platform:       p.platform,
      externalId:     p.externalId,
      postText:       p.postText,
      sourceUrl:      p.sourceUrl,
      keywordMatched: p.keywordMatched,
    })),
    skipDuplicates: true,
  });

  // Fetch the UUID primary keys of the newly created rows
  let newIds: string[] = [];
  if (result.count > 0 && novelExternalIds.length > 0) {
    const created = await prisma.post.findMany({
      where:  { externalId: { in: novelExternalIds } },
      select: { id: true },
    });
    newIds = created.map((p) => p.id);
  }

  return { fetched: posts.length, stored: result.count, newIds };
}
