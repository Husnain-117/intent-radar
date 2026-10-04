import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getKeywordBatch } from '@/lib/keywords';
import { fetchAndStore } from '@/lib/fetchers';
import { scoreNewPosts } from '@/lib/openai';
import type { Platform } from '@/types';

export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

// POST /api/trigger/run
// Session-protected run cycle for the UI "Run Cycle" button.
// Fetches 5 keywords across all 4 platforms IN PARALLEL (not sequential),
// then immediately scores any newly stored posts.
// Parallel strategy: 5 keyword rounds × 4 concurrent platform calls ≈ 10–20 s
export async function POST() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const platforms: Platform[] = ['TWITTER', 'FACEBOOK', 'QUORA', 'REDDIT'];
  const keywords   = getKeywordBatch(5); // 5 keywords × 4 parallel = ~20 API calls

  let totalFetched = 0;
  let totalStored  = 0;
  const allNewIds: string[] = [];
  const errors: string[]    = [];

  // ── Step 1: Fetch all platforms in parallel per keyword ──────────────────
  for (const kw of keywords) {
    const results = await Promise.allSettled(
      platforms.map((platform) => fetchAndStore(platform, kw.query)),
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        totalFetched        += r.value.fetched;
        totalStored         += r.value.stored;
        allNewIds.push(...r.value.newIds);
        if (r.value.error) errors.push(`${platforms[i]}:${kw.query} — ${r.value.error}`);
      } else {
        errors.push(`${platforms[i]}:${kw.query} — ${r.reason}`);
      }
    }
  }

  // ── Step 2: Score only the newly stored posts ─────────────────────────────
  let scored = 0;
  if (allNewIds.length > 0) {
    try {
      const result = await scoreNewPosts(allNewIds);
      scored = result.updated;
    } catch (err) {
      errors.push(`scorer — ${(err as Error).message}`);
    }
  }

  const duration = Date.now() - startedAt;
  console.log(
    `[trigger/run] user=${user.email} fetched=${totalFetched} stored=${totalStored} scored=${scored} ms=${duration}`,
  );

  return NextResponse.json({
    ok:      true,
    keywords: keywords.length,
    fetched: totalFetched,
    stored:  totalStored,
    scored,
    duration,
    errors:  errors.slice(0, 10),
  });
}
