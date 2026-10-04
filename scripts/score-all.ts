import 'dotenv/config';
import { scoreAllPending } from '../src/lib/openai';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('\nScoring all PENDING posts with Groq llama-3.3-70b…\n');
  const { processed, updated } = await scoreAllPending(20);
  console.log(`\n✓ Done — processed: ${processed}, updated: ${updated}`);

  const breakdown = await prisma.post.groupBy({
    by: ['platform'],
    _count: { id: true },
    _avg:   { intentScore: true },
    where:  { intentScore: { not: null } },
    orderBy: { _avg: { intentScore: 'desc' } },
  });

  console.log('\nScore breakdown by platform:');
  breakdown.forEach((b) => {
    console.log(`  ${b.platform}: ${b._count.id} posts, avg score=${b._avg.intentScore?.toFixed(1)}`);
  });

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
