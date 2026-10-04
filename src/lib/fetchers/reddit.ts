import { retryFetch, rapidApiClient } from './retry';
import type { RawPost } from '../../types';

// ─── RapidAPI: reddit34.p.rapidapi.com ───────────────────────────────────────
// Docs: https://rapidapi.com/reddit-scraper/api/reddit34
// Endpoint used: GET /getPostsBySubreddit?subreddit={sub}&sort=new&limit=25
//                GET /getTopPostsBySubreddit?subreddit={sub}&sort=top&limit=25

const HOST   = 'reddit34.p.rapidapi.com';
const client = rapidApiClient(HOST);

// ─── CA real-estate focused subreddits ───────────────────────────────────────
// Rotated per run so we spread coverage without hammering one community.
const CA_SUBREDDITS = [
  'california',
  'realestate',
  'FirstTimeHomeBuyer',
  'SFBayArea',
  'LosAngeles',
  'sandiego',
  'orangecounty',
  'moving',
  'Mortgages',
  'personalfinance',
];

// ─── Response type shapes (reddit34 API) ─────────────────────────────────────
interface RedditApiPost {
  id?:          string;
  postId?:      string;
  name?:        string;
  title?:       string;
  text?:        string;
  selftext?:    string;
  body?:        string;
  url?:         string;
  permalink?:   string;
  author?:      string | { name?: string };
  score?:       number;
  numComments?: number;
  subreddit?:   string;
  created?:     number;
  isSelf?:      boolean;
}

interface RedditApiResponse {
  posts?:   RedditApiPost[];
  data?:    RedditApiPost[] | { children?: { data?: RedditApiPost }[] };
  results?: RedditApiPost[];
}

// ─── Map one raw API post → RawPost ──────────────────────────────────────────
function mapPost(item: RedditApiPost, keyword: string, sub: string): RawPost | null {
  const id = item.id ?? item.postId ?? item.name;
  if (!id) return null;

  const title    = item.title ?? '';
  const body     = item.selftext ?? item.text ?? item.body ?? '';
  const postText = body ? `${title}\n\n${body}` : title;
  if (!postText.trim()) return null;

  const permalink = item.permalink ?? '';
  const sourceUrl = permalink.startsWith('http')
    ? permalink
    : permalink
    ? `https://www.reddit.com${permalink}`
    : item.url ?? `https://www.reddit.com/r/${sub}`;

  return {
    platform:       'REDDIT',
    externalId:     `rapi_${id}`,
    postText:       postText.slice(0, 4000),
    sourceUrl,
    keywordMatched: keyword,
  };
}

// ─── Normalise the various response shapes reddit34 returns ──────────────────
// Actual reddit34 shape (confirmed):
//   { data: { posts: [{kind:"t3", data:{id,title,selftext,permalink,...}}, ...], cursor }, success }
// Each item in the posts/children array is a Reddit listing child {kind, data},
// so we unwrap the inner .data to get the actual post fields.
function extractPosts(raw: RedditApiResponse): RedditApiPost[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nested = (raw.data && !Array.isArray(raw.data)) ? (raw.data as any) : null;

  if (nested) {
    // reddit34 API: response.data.posts = [{kind, data}, ...]
    if (Array.isArray(nested.posts) && nested.posts.length > 0) {
      return (nested.posts as any[])
        .map((item) => item?.data ?? item)
        .filter(Boolean) as RedditApiPost[];
    }
    // Native Reddit listing: response.data.children = [{kind, data}, ...]
    if (Array.isArray(nested.children) && nested.children.length > 0) {
      return (nested.children as any[])
        .map((item) => item?.data ?? item)
        .filter(Boolean) as RedditApiPost[];
    }
  }

  // Flat arrays at the top level
  if (Array.isArray(raw.posts))   return raw.posts;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.data))    return raw.data as RedditApiPost[];
  return [];
}

// ─── Primary fetch: /getPostsBySubreddit ─────────────────────────────────────
async function fetchBySubreddit(sub: string, keyword: string): Promise<RawPost[]> {
  const data = await retryFetch<RedditApiResponse>(() =>
    client
      .get('/getPostsBySubreddit', {
        params: { subreddit: sub, sort: 'new', limit: 25 },
      })
      .then((r) => r.data),
  );

  return extractPosts(data)
    .map((item) => mapPost(item, keyword, sub))
    .filter((p): p is RawPost => p !== null);
}

// ─── Fallback fetch: /getTopPostsBySubreddit ──────────────────────────────────
async function fetchTopBySubreddit(sub: string, keyword: string): Promise<RawPost[]> {
  const data = await retryFetch<RedditApiResponse>(() =>
    client
      .get('/getTopPostsBySubreddit', {
        params: { subreddit: sub, sort: 'top', limit: 25 },
      })
      .then((r) => r.data),
  );

  return extractPosts(data)
    .map((item) => mapPost(item, keyword, sub))
    .filter((p): p is RawPost => p !== null);
}

// ─── Public entry point called by fetchAndStore ───────────────────────────────
// Picks two subreddits per call (spread coverage, stay within rate limits).
// Tries /getPostsBySubreddit first; falls back to /getTopPostsBySubreddit.
export async function fetchReddit(keyword: string): Promise<RawPost[]> {
  // Pick 2 subreddits deterministically from the keyword so the same keyword
  // always hits the same communities (avoids duplicate externalIds across runs).
  const seed  = keyword.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const sub1  = CA_SUBREDDITS[seed % CA_SUBREDDITS.length];
  const sub2  = CA_SUBREDDITS[(seed + 3) % CA_SUBREDDITS.length];
  const subs  = Array.from(new Set([sub1, sub2]));

  const posts: RawPost[] = [];

  for (const sub of subs) {
    try {
      const fetched = await fetchBySubreddit(sub, keyword);
      posts.push(...fetched);
      console.log(`[fetchReddit] r/${sub} "${keyword}" → ${fetched.length} posts`);
    } catch (primaryErr: any) {
      console.warn(`[fetchReddit] primary failed for r/${sub}: ${primaryErr?.message} — trying top endpoint`);
      try {
        const fallback = await fetchTopBySubreddit(sub, keyword);
        posts.push(...fallback);
        console.log(`[fetchReddit] r/${sub} fallback "${keyword}" → ${fallback.length} posts`);
      } catch (fallbackErr: any) {
        console.warn(`[fetchReddit] fallback also failed for r/${sub}: ${fallbackErr?.message}`);
      }
    }
  }

  return posts;
}
