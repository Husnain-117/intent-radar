import { retryFetch, rapidApiClient } from './retry';
import type { RawPost } from '../../types';

const HOST = 'twitter-api45.p.rapidapi.com';
const client = rapidApiClient(HOST);

// Actual response shape from twitter-api45 /search.php
interface Tweet {
  type?: string;
  tweet_id?: string;
  screen_name?: string;
  text?: string;
  full_text?: string;
  created_at?: string;
  favorites?: number;
  retweets?: number;
  bookmarks?: number;
}

interface TwitterSearchResponse {
  status?: string;
  timeline?: Tweet[];
  results?: Tweet[];
  data?: Tweet[];
}

function mapTweet(item: Tweet, keyword: string): RawPost | null {
  const id = item.tweet_id;
  const text = item.full_text ?? item.text ?? '';
  const screenName = item.screen_name ?? 'unknown';

  if (!id) return null;

  return {
    platform: 'TWITTER',
    externalId: `tw_${id}`,
    postText: text.slice(0, 4000),
    sourceUrl: `https://twitter.com/${screenName}/status/${id}`,
    keywordMatched: keyword,
  };
}

export async function fetchTwitter(keyword: string): Promise<RawPost[]> {
  const data = await retryFetch<TwitterSearchResponse>(() =>
    client
      .get('/search.php', { params: { query: keyword, count: 20, searchType: 'Latest' } })
      .then((r) => r.data),
  );

  const items: Tweet[] = data?.timeline ?? data?.results ?? data?.data ?? [];
  const posts: RawPost[] = [];

  for (const item of items) {
    if (item.type !== 'tweet') continue;
    const post = mapTweet(item, keyword);
    if (post) posts.push(post);
  }

  return posts;
}
