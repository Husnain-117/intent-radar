import { NextRequest, NextResponse } from 'next/server';
import { getKeywordBatch } from '@/lib/keywords';
import { fetchAndStore } from '@/lib/fetchers';
import { scoreAllPending } from '@/lib/openai';
import type { Platform } from '@/types';

export const dynamic = 'force-dynamic';

// POST /api/fetch/trigger — manual pipeline trigger (blueprint §6.2)
// Same logic as /api/cron/run but accepts POST and is callable from scripts/tests.
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader   = req.headers.get('authorization') ?? '';
  const bearerSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const provided     = bearerSecret ?? headerSecret;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: { keywordCount?: number; scoreAfter?: boolean } = await req.json().catch(() => ({}));
  const keywordCount = body.keywordCount ?? 50;
  const scoreAfter   = body.scoreAfter !== false;

  const startedAt  = Date.now();
  const platforms: Platform[] = ['TWITTER', 'FACEBOOK', 'QUORA', 'REDDIT'];
  const keywords   = getKeywordBatch(keywordCount);

  let totalFetched = 0;
  let totalStored  = 0;
  const errors: string[] = [];

  for (const kw of keywords) {
    for (const platform of platforms) {
      try {
        const result = await fetchAndStore(platform, kw.query);
        totalFetched += result.fetched;
        totalStored  += result.stored;
        if (result.error) errors.push(`${platform}:${kw.query} — ${result.error}`);
      } catch (err) {
        errors.push(`${platform}:${kw.query} — ${(err as Error).message}`);
      }
    }
  }

  let scored = 0;
  if (scoreAfter) {
    try {
      const result = await scoreAllPending();
      scored = result.updated;
    } catch (err) {
      errors.push(`scorer — ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    ok:       true,
    keywords: keywords.length,
    fetched:  totalFetched,
    stored:   totalStored,
    scored,
    duration: Date.now() - startedAt,
    errors:   errors.slice(0, 20),
  });
}
