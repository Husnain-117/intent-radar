// ─── Platform & Status Enums ─────────────────────────────────────────────────

export type Platform = 'QUORA' | 'FACEBOOK' | 'TWITTER' | 'REDDIT';
export type PostStatus = 'PENDING' | 'DONE' | 'SKIPPED';

// ─── Raw Post (from platform fetchers before DB storage) ──────────────────────

export interface RawPost {
  platform: Platform;
  externalId: string;
  postText: string;
  sourceUrl: string;
  keywordMatched: string;
}

// ─── Post as returned by the API (with optional worker join) ─────────────────

export interface PostWithWorker {
  id: string;
  platform: Platform;
  postText: string | null;
  sourceUrl: string;
  keywordMatched: string | null;
  intentScore: number | null;
  matchedKeywords: string[];
  aiReason: string | null;
  status: PostStatus;
  fetchedAt: string;
  reviewedAt: string | null;
  worker?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  total: number;
  pending: number;
  done: number;
  skipped: number;
  highIntent: number;
  byPlatform: Array<{
    platform: Platform;
    _count: number;
  }>;
}

// ─── AI Filter Result (from GPT-4o) ──────────────────────────────────────────

export interface FilterResult {
  score: number;
  matchedKeywords: string[];
  reason: string;
  keep: boolean;
}

// ─── Fetch Log ───────────────────────────────────────────────────────────────

export interface FetchLogEntry {
  id: string;
  platform: Platform;
  keyword: string;
  postsFetched: number;
  postsStored: number;
  errorMessage: string | null;
  duration: number | null;
  createdAt: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total?: number;
}

export interface ApiError {
  error: string;
  message: string;
}
