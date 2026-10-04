import { NextRequest, NextResponse } from 'next/server';
import { getKeywordBatch } from '@/lib/keywords';
import { fetchAndStore } from '@/lib/fetchers';
import { scoreNewPosts } from '@/lib/openai';
import type { Platform } from '@/types';

export const dynamic = 'force-dynamic';

// Vercel Cron (Authorization: Bearer CRON_SECRET) or manual UI call (x-cron-secret header)
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  const authHeader   = req.headers.get('authorization') ?? '';
  const bearerSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Manual UI button sends: x-cron-secret header
  const headerSecret = req.headers.get('x-cron-secret');

  // Query-param fallback for local testing: ?secret=...
  const querySecret  = req.nextUrl.searchParams.get('secret');

  const provided = bearerSecret ?? headerSecret ?? querySecret;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const platforms: Platform[] = ['TWITTER', 'FACEBOOK', 'QUORA', 'REDDIT'];
  const keywords = getKeywordBatch(15);

  let totalFetched = 0;
  let totalStored  = 0;
  const allNewIds: string[] = [];
  const errors: string[]    = [];

  // ── Step 1: Fetch fresh posts, accumulate newly stored IDs ───────────────
  console.log(`[cron/run] Fetching ${keywords.length} keywords × ${platforms.length} platforms`);

  for (const kw of keywords) {
    for (const platform of platforms) {
      try {
        const result = await fetchAndStore(platform, kw.query);
        totalFetched        += result.fetched;
        totalStored         += result.stored;
        allNewIds.push(...result.newIds);
        if (result.error) errors.push(`${platform}:${kw.query} — ${result.error}`);
      } catch (err) {
        errors.push(`${platform}:${kw.query} — ${(err as Error).message}`);
      }
    }
  }

  console.log(`[cron/run] Fetch done — fetched=${totalFetched} stored=${totalStored} newIds=${allNewIds.length}`);

  // ── Step 2: Score ONLY the newly fetched posts (targeted, no backlog churn) ─
  // This guarantees every post is scored in the same execution window it was stored.
  let scored = 0;
  if (allNewIds.length > 0) {
    console.log(`[cron/run] Scoring ${allNewIds.length} newly stored posts…`);
    try {
      const result = await scoreNewPosts(allNewIds);
      scored = result.updated;
      console.log(`[cron/run] Scored ${scored}/${allNewIds.length} new posts`);
    } catch (err) {
      errors.push(`scorer — ${(err as Error).message}`);
    }
  }

  const duration = Date.now() - startedAt;
  console.log(`[cron/run] Cycle complete — scored=${scored} duration=${duration}ms errors=${errors.length}`);

  return NextResponse.json({
    ok:       true,
    keywords: keywords.length,
    fetched:  totalFetched,
    stored:   totalStored,
    scored,
    duration,
    errors:   errors.slice(0, 20),
  });
}
