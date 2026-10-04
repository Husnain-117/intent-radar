import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { scoreAllPending } from '@/lib/openai';

export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

// POST /api/trigger/score
// Session-protected (no CRON_SECRET needed from browser).
// Scores up to 60 pending posts and returns the count — called by the
// "Score Backlog" button which chains this until updated === 0.
export async function POST() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const result    = await scoreAllPending(20, 60);
  const duration  = Date.now() - startedAt;

  console.log(`[trigger/score] user=${user.email} updated=${result.updated} ms=${duration}`);

  return NextResponse.json({
    ok:        true,
    updated:   result.updated,
    processed: result.processed,
    duration,
  });
}
