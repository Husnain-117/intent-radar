import { NextRequest, NextResponse } from 'next/server';
import { scoreAllPending } from '@/lib/openai';

export const dynamic    = 'force-dynamic';
export const maxDuration = 60; // seconds — respected on Vercel Pro, capped to 10s on Hobby

export async function GET(req: NextRequest) {
  const cronSecret   = process.env.CRON_SECRET;
  const authHeader   = req.headers.get('authorization') ?? '';
  const bearerSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const headerSecret = req.headers.get('x-cron-secret');
  const querySecret  = req.nextUrl.searchParams.get('secret');
  const provided     = bearerSecret ?? headerSecret ?? querySecret;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platform = req.nextUrl.searchParams.get('platform') ?? undefined;
  // Default to 60 posts (3 batches of 20) — fits within 10 s on Hobby at ~3 s/batch
  const max      = parseInt(req.nextUrl.searchParams.get('max') ?? '60', 10);

  const startedAt = Date.now();
  const result    = await scoreAllPending(20, max, platform);
  const duration  = Date.now() - startedAt;

  console.log(`[cron/score] scored=${result.updated} processed=${result.processed} ms=${duration}`);

  return NextResponse.json({
    ok:        true,
    updated:   result.updated,
    processed: result.processed,
    platform:  platform ?? 'ALL',
    duration,
  });
}
