import OpenAI from 'openai';
import { prisma } from './prisma';
import { env } from './env';
import intentWeights from '../../keywords/intent_weights_v2.json';

const openai = new OpenAI({
  apiKey:  env.OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// ─── System prompt built from intent_weights_v2.json ─────────────────────────
const WEIGHT_LINES = Object.entries(intentWeights as Record<string, number>)
  .sort((a, b) => b[1] - a[1])
  .map(([phrase, w]) => `  "${phrase}" → ${w}`)
  .join('\n');

const SYSTEM_PROMPT = `You are a California real estate lead scoring engine.

Given a list of social media posts, score each one 1–10 for purchase/relocation intent.
Use these intent signals and their weights to guide your score:
${WEIGHT_LINES}

Scoring guide:
  9–10 = Actively buying, has budget/preapproval, urgently looking
  7–8  = Strong relocation or buying research intent
  5–6  = General relocation interest, early-stage research
  3–4  = Neighbourhood curiosity, lifestyle questions
  1–2  = Off-topic, no clear CA real estate intent

Rules:
- Score ONLY based on the post text. Ignore username/platform.
- If the post is unrelated to CA real estate or relocation, score it 1.
- Return ONLY valid JSON — no markdown, no extra text.

Response format (array, same order as input):
[
  {
    "index": 0,
    "score": 8,
    "reason": "one-sentence explanation",
    "matched": ["phrase1", "phrase2"]
  },
  ...
]`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScoreResult {
  index: number;
  score: number;
  reason: string;
  matched: string[];
}

interface PostToScore {
  id: string;
  postText: string | null;
}

// ─── Score one batch of up to 20 posts ───────────────────────────────────────
export async function scoreBatch(posts: PostToScore[]): Promise<ScoreResult[]> {
  if (posts.length === 0) return [];

  const userMessage = posts
    .map((p, i) => `[${i}] ${(p.postText ?? '').slice(0, 500)}`)
    .join('\n\n');

  const response = await openai.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? '[]';

  // Strip markdown fences if model wraps in ```json
  const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

  return JSON.parse(clean) as ScoreResult[];
}

// ─── Score all PENDING posts in DB in batches of 20 ──────────────────────────
export async function scoreAllPending(
  batchSize = 20,
  maxPosts = 100,
  platformFilter?: string,
): Promise<{ processed: number; updated: number }> {
  let processed = 0;
  let updated   = 0;
  let cursor: string | undefined;

  while (processed < maxPosts) {
    const remaining = maxPosts - processed;
    const batch = await prisma.post.findMany({
      where: {
        status:      'PENDING',
        intentScore: null,
        ...(platformFilter ? { platform: platformFilter as any } : {}),
      },
      select:  { id: true, postText: true },
      take:    Math.min(batchSize, remaining),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { fetchedAt: 'desc' },
    });

    if (batch.length === 0) break;
    processed += batch.length;
    cursor     = batch[batch.length - 1].id;

    let results: ScoreResult[];
    try {
      results = await scoreBatch(batch);
    } catch (err) {
      console.error('[scoreAllPending] GPT-4o error:', (err as Error).message);
      break;
    }

    // Write scores back to DB in parallel (was sequential — now 3-4x faster)
    await Promise.all(
      results.map((r) => {
        const post = batch[r.index];
        if (!post) return Promise.resolve();
        return prisma.post.update({
          where: { id: post.id },
          data: {
            intentScore:     r.score,
            aiReason:        r.reason,
            matchedKeywords: r.matched,
          },
        });
      }),
    );

    updated += results.length;
    console.log(`[scoreAllPending] scored ${processed} posts so far (${updated} updated)`);
  }

  return { processed, updated };
}

// ─── Score a specific list of post IDs (used right after fetch) ───────────────
// Only processes posts that are still unscored (intentScore = null).
export async function scoreNewPosts(
  ids: string[],
  batchSize = 20,
): Promise<{ processed: number; updated: number }> {
  if (ids.length === 0) return { processed: 0, updated: 0 };

  let processed = 0;
  let updated   = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const slice = ids.slice(i, i + batchSize);

    const batch = await prisma.post.findMany({
      where:   { id: { in: slice }, intentScore: null },
      select:  { id: true, postText: true },
    });

    if (batch.length === 0) continue;
    processed += batch.length;

    let results: ScoreResult[];
    try {
      results = await scoreBatch(batch);
    } catch (err) {
      console.error('[scoreNewPosts] LLM error:', (err as Error).message);
      break;
    }

    await Promise.all(
      results.map((r) => {
        const post = batch[r.index];
        if (!post) return Promise.resolve();
        return prisma.post.update({
          where: { id: post.id },
          data: {
            intentScore:     r.score,
            aiReason:        r.reason,
            matchedKeywords: r.matched,
          },
        });
      }),
    );

    updated += results.length;
    console.log(`[scoreNewPosts] scored ${updated}/${ids.length} new posts`);
  }

  return { processed, updated };
}
