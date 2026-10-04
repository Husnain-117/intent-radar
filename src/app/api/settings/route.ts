import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, setSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getAllSettings();

  // Mask API key values — return only first 6 + last 4 chars
  const masked = { ...settings };
  for (const key of ['rapidapi_key', 'groq_api_key']) {
    const v = masked[key] ?? '';
    masked[key] = v.length > 10 ? `${v.slice(0, 6)}${'•'.repeat(v.length - 10)}${v.slice(-4)}` : v ? '••••••••' : '';
  }

  return NextResponse.json(masked);
}

export async function PUT(req: NextRequest) {
  const body: Record<string, string> = await req.json();

  // Prevent saving masked placeholder values back to DB
  const MASKED_KEYS = ['rapidapi_key', 'groq_api_key'];
  for (const key of MASKED_KEYS) {
    if (body[key]?.includes('•')) delete body[key];
  }

  // Basic validation
  const num = (k: string, min: number, max: number) => {
    const v = Number(body[k]);
    if (body[k] !== undefined && (isNaN(v) || v < min || v > max)) {
      throw new Error(`${k} must be between ${min} and ${max}`);
    }
  };

  try {
    num('fetch_interval_hours', 1, 24);
    num('batch_size_keywords',  5, 500);
    num('max_keywords_per_run', 5, 1000);
    num('min_intent_score',     1, 9);
    num('ai_batch_size',        5, 50);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  await setSettings(body);
  return NextResponse.json({ ok: true });
}
