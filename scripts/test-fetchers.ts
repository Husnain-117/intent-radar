import 'dotenv/config';
import { fetchQuora } from '../src/lib/fetchers/quora';
import { fetchFacebook } from '../src/lib/fetchers/facebook';
import { fetchTwitter } from '../src/lib/fetchers/twitter';
import { upsertPosts } from '../src/lib/fetchers/retry';
import type { RawPost } from '../src/types';

const TEST_KEYWORD = 'moving to Bay Area';

function separator(label: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(` ${label}`);
  console.log('─'.repeat(60));
}

function printPosts(posts: RawPost[]) {
  if (posts.length === 0) {
    console.log('  ⚠  No posts returned');
    return;
  }
  posts.slice(0, 3).forEach((p, i) => {
    console.log(`\n  [${i + 1}] ${p.platform} · externalId: ${p.externalId}`);
    console.log(`       URL  : ${p.sourceUrl}`);
    console.log(`       Text : ${(p.postText ?? '').slice(0, 120).replace(/\n/g, ' ')}…`);
  });
  console.log(`\n  ✓ Total returned: ${posts.length}`);
}

async function main() {
  console.log(`\nTest keyword: "${TEST_KEYWORD}"\n`);

  // ── Quora ──────────────────────────────────────────────────────────────────
  separator('1 · Quora');
  let quoraPosts: RawPost[] = [];
  try {
    quoraPosts = await fetchQuora(TEST_KEYWORD);
    printPosts(quoraPosts);
  } catch (err) {
    console.error('  ✗ Error:', (err as Error).message);
    console.log('\n  Raw response hint: check endpoint /search_answers on quora-scraper.p.rapidapi.com');
  }

  // ── Facebook ───────────────────────────────────────────────────────────────
  separator('2 · Facebook');
  let facebookPosts: RawPost[] = [];
  try {
    facebookPosts = await fetchFacebook(TEST_KEYWORD);
    printPosts(facebookPosts);
  } catch (err) {
    console.error('  ✗ Error:', (err as Error).message);
    console.log('\n  Raw response hint: check endpoint /search on facebook-scraper3.p.rapidapi.com');
  }

  // ── Twitter ────────────────────────────────────────────────────────────────
  separator('3 · Twitter / X');
  let twitterPosts: RawPost[] = [];
  try {
    twitterPosts = await fetchTwitter(TEST_KEYWORD);
    printPosts(twitterPosts);
  } catch (err) {
    console.error('  ✗ Error:', (err as Error).message);
    console.log('\n  Raw response hint: check endpoint /search on twitter-x-api.p.rapidapi.com');
  }

  // ── DB Upsert ─────────────────────────────────────────────────────────────
  separator('4 · DB Upsert (combined)');
  const all = [...quoraPosts, ...facebookPosts, ...twitterPosts];
  if (all.length > 0) {
    try {
      const { fetched, stored } = await upsertPosts(all);
      console.log(`  ✓ Fetched: ${fetched}  Stored (new): ${stored}  Duplicates skipped: ${fetched - stored}`);
    } catch (err) {
      console.error('  ✗ DB error:', (err as Error).message);
      console.log('  Hint: check DATABASE_URL in .env — DB must be reachable');
    }
  } else {
    console.log('  ⚠  No posts to upsert');
  }

  separator('Done');
  console.log('');
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
