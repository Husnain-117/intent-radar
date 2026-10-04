import { z } from 'zod';

const envSchema = z.object({
  // ─── Phase 1: Database & App ──────────────────────────────────────────────
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid URL' }),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, { message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required' }),

  // ─── Cron / API Security ─────────────────────────────────────────────────
  // Required in production so /api/cron/run and /api/fetch/trigger are protected.
  CRON_SECRET: z.string().min(16, { message: 'CRON_SECRET must be at least 16 characters' }).optional(),

  // ─── Phase 3: RapidAPI Fetchers (optional until Phase 3) ─────────────────
  RAPIDAPI_KEY: z.string().min(10).optional(),

  // ─── Phase 4: Groq / OpenAI-compatible key (optional until Phase 4) ─────
  // Groq keys start with gsk_, OpenAI keys start with sk- — accept either.
  OPENAI_API_KEY: z.string().min(10).optional(),

  // ─── Phase 5: Redis / BullMQ (optional until Phase 5) ────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10).optional(),
  UPSTASH_REDIS_URL: z.string().optional(),

  // ─── Fetch Config (safe defaults for all phases) ─────────────────────────
  FETCH_INTERVAL_HOURS: z.coerce.number().default(6),
  MIN_INTENT_SCORE: z.coerce.number().default(6),
  BATCH_SIZE_KEYWORDS: z.coerce.number().default(50),
  OPENAI_BATCH_SIZE: z.coerce.number().default(20),
  MAX_KEYWORDS_PER_RUN: z.coerce.number().default(500),

  // ─── App ─────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

// Allow skipping validation at build time (next build runs module code for
// static pages; API-route modules are NOT pre-rendered but some bundler paths
// can still trigger this). Set SKIP_ENV_VALIDATION=1 in Vercel Build settings.
const skipValidation =
  process.env.SKIP_ENV_VALIDATION === '1' ||
  process.env.NEXT_PHASE === 'phase-production-build';

const result = envSchema.safeParse(process.env);

if (!result.success && !skipValidation) {
  console.error('');
  console.error('❌ Invalid environment variables:');
  result.error.issues.forEach((issue) => {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('');
  console.error('📄 See .env.example for the full list of required variables.');
  console.error('');
  throw new Error('Environment validation failed. Fix the above issues before starting.');
}

// During build (skipValidation=true) result.data may be undefined — fall back
// to process.env so module-level consumers get the raw value without crashing.
export const env = (result.success ? result.data : process.env) as Env;
