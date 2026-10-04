export { fetchQuora } from './quora';
export { fetchFacebook } from './facebook';
export { fetchTwitter } from './twitter';
export { fetchReddit } from './reddit';
export { retryFetch, upsertPosts } from './retry';

import { fetchQuora } from './quora';
import { fetchFacebook } from './facebook';
import { fetchTwitter } from './twitter';
import { fetchReddit } from './reddit';
import { upsertPosts } from './retry';
import { prisma } from '../prisma';
import type { Platform, RawPost } from '../../types';

// ─── Fetch + upsert for one platform + keyword ───────────────────────────────
// Returns fetched/stored counts plus newIds — the DB IDs of posts that were
// genuinely new (not duplicates). Callers use newIds to score only fresh posts.
export async function fetchAndStore(
  platform: Platform,
  keyword: string,
): Promise<{ fetched: number; stored: number; newIds: string[]; error?: string }> {
  const startedAt = Date.now();
  let posts: RawPost[] = [];
  let errorMessage: string | undefined;

  try {
    if (platform === 'QUORA')         posts = await fetchQuora(keyword);
    else if (platform === 'FACEBOOK') posts = await fetchFacebook(keyword);
    else if (platform === 'TWITTER')  posts = await fetchTwitter(keyword);
    else if (platform === 'REDDIT')   posts = await fetchReddit(keyword);
  } catch (err) {
    errorMessage = (err as Error).message;
  }

  const { fetched, stored, newIds } = await upsertPosts(posts);
  const duration = Date.now() - startedAt;

  await prisma.fetchLog.create({
    data: {
      platform,
      keyword,
      postsFetched: fetched,
      postsStored:  stored,
      errorMessage: errorMessage ?? null,
      duration,
    },
  });

  return { fetched, stored, newIds, error: errorMessage };
}
