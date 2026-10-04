import 'dotenv/config';
import { scoreBatch } from '../src/lib/openai';
import { prisma } from '../src/lib/prisma';

function separator(label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(` ${label}`);
  console.log('─'.repeat(60));
}

async function main() {
  separator('1 · Fetch up to 5 PENDING posts from DB');
  const posts = await prisma.post.findMany({
    where:   { status: 'PENDING', intentScore: null },
    select:  { id: true, postText: true, platform: true, keywordMatched: true },
    take:    5,
    orderBy: { createdAt: 'asc' },
  });

  if (posts.length === 0) {
    console.log('  ⚠  No PENDING posts found — run test-fetchers.ts first');
    process.exit(0);
  }
  console.log(`  Found ${posts.length} posts to score`);

  separator('2 · Score batch with GPT-4o');
  const results = await scoreBatch(posts);

  results.forEach((r) => {
    const post = posts[r.index];
    console.log(`\n  [${r.index}] ${post?.platform} · score=${r.score}`);
    console.log(`       Matched : ${r.matched.join(', ') || 'none'}`);
    console.log(`       Reason  : ${r.reason}`);
    console.log(`       Text    : ${(post?.postText ?? '').slice(0, 100).replace(/\n/g, ' ')}…`);
  });

  separator('3 · Write scores back to DB');
  let updated = 0;
  for (const r of results) {
    const post = posts[r.index];
    if (!post) continue;
    await prisma.post.update({
      where: { id: post.id },
      data: {
        intentScore:     r.score,
        aiReason:        r.reason,
        matchedKeywords: r.matched,
      },
    });
    updated++;
  }
  console.log(`  ✓ Updated ${updated} posts in DB`);

  separator('4 · Verify from DB');
  const verified = await prisma.post.findMany({
    where:   { id: { in: posts.map((p) => p.id) } },
    select:  { id: true, intentScore: true, aiReason: true },
    orderBy: { intentScore: 'desc' },
  });
  verified.forEach((p) => {
    console.log(`  score=${p.intentScore} · ${p.aiReason?.slice(0, 80)}`);
  });

  separator('Done ✓');
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
