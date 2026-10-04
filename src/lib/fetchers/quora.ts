import axios from 'axios';
import type { RawPost } from '../../types';

// ─── Reddit JSON API — no key required, excellent CA real-estate signal ────────
// Searches r/California, r/RealEstate, r/SFBayArea, r/LosAngeles, r/FirstTimeHomeBuyer
// Posts stored under QUORA platform (schema enum unchanged).

const SUBREDDITS = [
  'California',
  'RealEstate',
  'FirstTimeHomeBuyer',
  'SFBayArea',
  'LosAngeles',
];

const REDDIT_HEADERS = {
  'User-Agent': 'LeadPulse-CA/1.0 (lead-generation research bot)',
};

interface RedditChild {
  kind: string;
  data: {
    id?:        string;
    name?:      string;
    title?:     string;
    selftext?:  string;
    url?:       string;
    permalink?: string;
    subreddit?: string;
    score?:     number;
    author?:    string;
  };
}

interface RedditResponse {
  data?: {
    children?: RedditChild[];
  };
}

function mapRedditPost(child: RedditChild, keyword: string): RawPost | null {
  const d = child.data;
  if (!d.id && !d.permalink) return null;

  const title   = d.title ?? '';
  const body    = d.selftext ?? '';
  const text    = body ? `${title}\n\n${body}` : title;
  const postUrl = d.permalink
    ? `https://www.reddit.com${d.permalink}`
    : (d.url ?? '');

  if (!text.trim()) return null;

  return {
    platform:       'QUORA',
    externalId:     `reddit_${d.id ?? d.name ?? encodeURIComponent(postUrl).slice(-30)}`,
    postText:       text.slice(0, 4000),
    sourceUrl:      postUrl,
    keywordMatched: keyword,
  };
}

// ─── Fetch CA real-estate posts from Reddit for a given keyword ───────────────
export async function fetchQuora(keyword: string): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const sub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];

  try {
    const url = `https://www.reddit.com/r/${sub}/search.json`;
    const res = await axios.get<RedditResponse>(url, {
      params: {
        q:           keyword,
        sort:        'new',
        limit:       25,
        type:        'link',
        restrict_sr: 'true',
        t:           'year',
      },
      headers:  REDDIT_HEADERS,
      timeout:  12_000,
    });

    const children = res.data?.data?.children ?? [];
    for (const child of children) {
      const post = mapRedditPost(child, keyword);
      if (post) posts.push(post);
    }

    console.log(`[fetchReddit] r/${sub} "${keyword}" → ${posts.length} posts`);
  } catch (err: any) {
    console.warn(`[fetchReddit] failed for "${keyword}": ${err?.message}`);
  }

  return posts;
}
