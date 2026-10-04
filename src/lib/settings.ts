import { prisma } from './prisma';

// ─── Default values (mirrors .env safe defaults) ──────────────────────────────
export const SETTING_DEFAULTS: Record<string, string> = {
  fetch_interval_hours:  process.env.FETCH_INTERVAL_HOURS   ?? '6',
  batch_size_keywords:   process.env.BATCH_SIZE_KEYWORDS    ?? '50',
  max_keywords_per_run:  process.env.MAX_KEYWORDS_PER_RUN   ?? '500',
  min_intent_score:      process.env.MIN_INTENT_SCORE       ?? '6',
  ai_batch_size:         process.env.OPENAI_BATCH_SIZE      ?? '20',
  ai_model:              'llama-3.3-70b-versatile',
  auto_score_on_fetch:   'true',
  enabled_platforms:     '["TWITTER","FACEBOOK","QUORA","REDDIT"]',
  rapidapi_key:          process.env.RAPIDAPI_KEY           ?? '',
  groq_api_key:          process.env.OPENAI_API_KEY         ?? '',
};

export type SettingKey = keyof typeof SETTING_DEFAULTS;

// ─── In-process cache (TTL 60s) ───────────────────────────────────────────────
let _cache: Record<string, string> | null = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;

export async function getAllSettings(): Promise<Record<string, string>> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  const rows = await prisma.systemSetting.findMany();
  const map: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    map[row.key] = row.value;
  }

  _cache  = map;
  _cacheAt = Date.now();
  return map;
}

export async function getSetting(key: string): Promise<string> {
  const all = await getAllSettings();
  return all[key] ?? SETTING_DEFAULTS[key] ?? '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where:  { key },
    update: { value },
    create: { key, value },
  });
  _cache = null;
}

export async function setSettings(updates: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
  _cache = null;
}

export function invalidateCache(): void {
  _cache = null;
}
