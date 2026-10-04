import 'dotenv/config';
import { getKeywordBatch } from '../src/lib/keywords';
import { fetchAndStore } from '../src/lib/fetchers';
import { scoreAllPending } from '../src/lib/openai';
import { prisma } from '../src/lib/prisma';
import type { Platform } from '../src/types';

const PLATFORMS: Platform[] = ['TWITTER', 'FACEBOOK', 'QUORA'];

// Allow overriding keyword count from CLI: npx ts-node ... run-cycle.ts 10
const COUNT = parseInt(process.argv[2] ?? '5', 10);

function separator(label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(` ${label}`);
  console.log('─'.repeat(60));
}

async function main() {
  const startedAt = Date.now();

  separator(`1 · Load ${COUNT} weighted keywords`);
  const keywords = getKeywordBatch(COUNT);
  keywords.forEach((k, i) => console.log(`  [${i + 1}] "${k.query}" (score=${k.score})`));

  separator('2 · Fetch posts from all platforms');
  let totalFetched = 0;
  let totalStored  = 0;

  for (const kw of keywords) {
    for (const platform of PLATFORMS) {
      const r = await fetchAndStore(platform, kw.query);
      totalFetched += r.fetched;
      totalStored  += r.stored;
      const tag = r.error ? `✗ ${r.error.slice(0, 60)}` : `✓ fetched=${r.fetched} stored=${r.stored}`;
      console.log(`  ${platform.padEnd(10)} "${kw.query.slice(0, 40)}" → ${tag}`);
    }
  }
  console.log(`\n  Total: fetched=${totalFetched}  stored=${totalStored}  duplicates=${totalFetched - totalStored}`);

  separator('3 · Score all PENDING posts with Groq');
  const { processed, updated } = await scoreAllPending(20);
  console.log(`  ✓ Processed=${processed}  Updated=${updated}`);

  separator('4 · DB summary');
  const [total, scored, high] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { intentScore: { not: null } } }),
    prisma.post.count({ where: { intentScore: { gte: parseInt(process.env.MIN_INTENT_SCORE ?? '6', 10) } } }),
  ]);
  console.log(`  Total posts  : ${total}`);
  console.log(`  Scored       : ${scored}`);
  console.log(`  High intent  : ${high} (score ≥ ${process.env.MIN_INTENT_SCORE ?? 6})`);

  const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
  separator(`Done in ${duration}s ✓`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
