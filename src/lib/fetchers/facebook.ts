import { retryFetch, rapidApiClient } from './retry';
import type { RawPost } from '../../types';

const HOST = 'facebook-scraper3.p.rapidapi.com';
const client = rapidApiClient(HOST);

interface FacebookPost {
  post_id?: string;
  id?: string;
  message?: string;
  text?: string;
  story?: string;
  content?: string;
  link?: string;
  url?: string;
  permalink_url?: string;
  type?: string;
  timestamp?: string;
  created_time?: string;
}

interface FacebookSearchResponse {
  results?: FacebookPost[];
  data?: FacebookPost[];
  posts?: FacebookPost[];
}

function mapPost(item: FacebookPost, keyword: string): RawPost | null {
  const id = item.post_id ?? item.id;
  const text = item.message ?? item.text ?? item.story ?? item.content ?? '';
  const url = item.permalink_url ?? item.link ?? item.url ?? '';

  if (!id) return null;

  return {
    platform: 'FACEBOOK',
    externalId: `fb_${id}`,
    postText: text.slice(0, 4000),
    sourceUrl: url || `https://www.facebook.com/${id}`,
    keywordMatched: keyword,
  };
}

export async function fetchFacebook(keyword: string): Promise<RawPost[]> {
  const data = await retryFetch<FacebookSearchResponse>(() =>
    client
      .get('/search/posts', { params: { query: keyword } })
      .then((r) => r.data),
  );

  const items: FacebookPost[] = data?.results ?? data?.data ?? data?.posts ?? [];
  const posts: RawPost[] = [];

  for (const item of items) {
    const post = mapPost(item, keyword);
    if (post) posts.push(post);
  }

  return posts;
}
