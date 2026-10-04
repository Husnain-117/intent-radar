import {
  loadKeywords,
  selectWeighted,
  getKeywordBatch,
  scoreTiers,
  clearKeywordCache,
} from '../src/lib/keywords';

function separator(label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(` ${label}`);
  console.log('─'.repeat(60));
}

async function main() {
  separator('1 · CSV Load & Artifact Cleaning');
  const t0 = Date.now();
  const keywords = loadKeywords();
  const loadMs = Date.now() - t0;

  console.log(`✓ Loaded  : ${keywords.length.toLocaleString()} clean keywords`);
  console.log(`✓ Time    : ${loadMs}ms`);

  if (keywords.length === 0) {
    console.error('✗ No keywords loaded — check CSV path / filtering logic');
    process.exit(1);
  }

  separator('2 · Score-Tier Distribution');
  const tiers = scoreTiers(keywords);
  const sorted = Object.entries(tiers).sort((a, b) => Number(b[0]) - Number(a[0]));
  sorted.forEach(([score, count]) => {
    const bar = '█'.repeat(Math.round((count / keywords.length) * 40));
    console.log(`  score ${score.padStart(2)}: ${count.toLocaleString().padStart(7)}  ${bar}`);
  });

  separator('3 · Weighted Batch Sample (20 keywords)');
  const batch = selectWeighted(keywords, 20);
  batch.forEach((k, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. [score=${k.score}] ${k.query}`);
  });

  separator('4 · Uniqueness Check (500-keyword batch, 3 runs)');
  for (let run = 1; run <= 3; run++) {
    clearKeywordCache();
    const b = getKeywordBatch(500);
    const queries = b.map((k) => k.query);
    const unique = new Set(queries).size;
    console.log(
      `  Run ${run}: ${b.length} keywords, ${unique} unique${unique < b.length ? ' ⚠ DUPLICATES' : ' ✓'}`
    );
  }

  separator('5 · Artifact Check — First 6 raw rows excluded');
  const rawCheck = keywords.slice(0, 5);
  const hasArtifact = rawCheck.some(
    (k) => k.place.startsWith('=') || k.place.startsWith('-') || k.query.includes('=====')
  );
  console.log(
    hasArtifact
      ? '  ✗ Artifacts still present in first 5 rows!'
      : '  ✓ No artifacts found in first 5 rows'
  );
  rawCheck.forEach((k) => console.log(`     "${k.query}" (place="${k.place}")`));

  separator('Done ✓');
  console.log('');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
