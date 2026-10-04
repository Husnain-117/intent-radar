'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Brain, TrendingUp, Clock, SlidersHorizontal, SearchX, ArrowDownUp } from 'lucide-react';
import { PostCard } from './PostCard';
import { StatsCard } from './StatsCard';

type Platform = 'ALL' | 'TWITTER' | 'FACEBOOK' | 'QUORA' | 'REDDIT';
type StatusFilter = 'PENDING' | 'DONE' | 'SKIPPED';

interface Post {
  id:               string;
  platform:         'TWITTER' | 'FACEBOOK' | 'QUORA' | 'REDDIT';
  postText:         string | null;
  sourceUrl:        string | null;
  keywordMatched:   string | null;
  intentScore:      number | null;
  matchedKeywords:  string[];
  aiReason:         string | null;
  status:           string;
  fetchedAt:        string;
  generatedComment: string | null;
}

interface StatsData {
  totalPosts: number; scoredPosts: number;
  highIntentPosts: number; pendingPosts: number; avgScore: number;
  statusCounts:    { PENDING: number; DONE: number; SKIPPED: number };
  platformBreakdown: { platform: string; count: number; avgScore: number }[];
  totalByPlatform:   { platform: string; count: number }[];
}

export function LeadBoard() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [posts,    setPosts]    = useState<Post[]>([]);
  const [stats,    setStats]    = useState<StatsData | null>(null);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [platform,  setPlatform]  = useState<Platform>((searchParams.get('platform') as Platform) ?? 'ALL');
  const [minScore,  setMinScore]  = useState(Number(searchParams.get('minScore') ?? 0));
  const [sliderVal, setSliderVal] = useState(Number(searchParams.get('minScore') ?? 0));
  const [statusF,   setStatusF]   = useState<StatusFilter>((searchParams.get('status') as StatusFilter) ?? 'PENDING');
  const [sortBy,    setSortBy]    = useState<'score' | 'recent'>((searchParams.get('sort') as 'score' | 'recent') ?? 'score');

  const fetchPosts = useCallback(async (p = 1) => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams({
        page:    String(p),
        limit:   '20',
        status:  statusF,
        ...(platform !== 'ALL' ? { platform } : {}),
        ...(minScore > 0 ? { minScore: String(minScore) } : {}),
        ...(sortBy === 'recent' ? { sort: 'recent' } : {}),
      });
      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPage(p);
    } catch (err) {
      console.error('[fetchPosts]', err);
      setFetchError(true);
      setPosts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [platform, minScore, statusF, sortBy]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('[fetchStats]', err);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (platform !== 'ALL') params.set('platform', platform);
    if (minScore > 0) params.set('minScore', String(minScore));
    if (statusF !== 'PENDING') params.set('status', statusF);
    if (sortBy === 'recent') params.set('sort', 'recent');
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [platform, minScore, statusF, sortBy, router]);

  useEffect(() => { fetchPosts(1); fetchStats(); }, [fetchPosts, fetchStats]);

  function handleAction(id: string, _status: 'DONE' | 'SKIPPED') {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setTotal((t) => t - 1);
    fetchStats();
  }

  const PLATFORMS: Platform[] = ['ALL', 'TWITTER', 'FACEBOOK', 'QUORA', 'REDDIT'];
  const STATUSES: StatusFilter[] = ['PENDING', 'DONE', 'SKIPPED'];

  const PLATFORM_ACTIVE: Record<Platform, string> = {
    ALL:      'bg-indigo-500  text-white shadow-sm',
    TWITTER:  'bg-slate-800   text-white shadow-sm',
    FACEBOOK: 'bg-blue-600    text-white shadow-sm',
    QUORA:    'bg-rose-600    text-white shadow-sm',
    REDDIT:   'bg-orange-500  text-white shadow-sm',
  };

  const STATUS_ACTIVE: Record<StatusFilter, string> = {
    PENDING: 'bg-amber-500 text-white shadow-sm',
    DONE:    'bg-emerald-500 text-white shadow-sm',
    SKIPPED: 'bg-slate-500 text-white shadow-sm',
  };

  return (
    <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6">

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatsCard label="Total Posts"   value={stats.totalPosts}      sub="scraped & stored"  accent="blue"  icon={FileText}    />
          <StatsCard label="AI Scored"     value={stats.scoredPosts}     sub="Groq LLaMA 3.3"    accent="gray"  icon={Brain}       />
          <StatsCard label="High Intent"   value={stats.highIntentPosts} sub="score ≥ 6"         accent="green" icon={TrendingUp}  />
          <StatsCard label="Avg Score"     value={stats.avgScore}        sub="of scored posts"   accent="amber" icon={Clock}       />
        </div>
      )}

      {/* Filter bar — stacks into 2 rows on mobile, single row on md+ */}
      <div className="flex flex-col gap-2 rounded-xl px-3 sm:px-4 py-3" style={{backgroundColor:'#FFFFFF',border:'1px solid #E6E0D7',boxShadow:'0 1px 4px rgba(18,50,74,0.05)'}}>

        {/* Row 1: platform tabs + leads count */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" strokeWidth={2} style={{color:'#5B6674'}} />

          {/* Platform tabs */}
          <div className="flex flex-wrap items-center gap-0.5 rounded-lg p-0.5" style={{backgroundColor:'#F1EEE7'}}>
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
                  platform === p ? PLATFORM_ACTIVE[p] : ''
                }`}
                style={platform !== p ? {color:'#5B6674'} : {}}
              >
                {p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{backgroundColor:'rgba(18,50,74,0.06)',color:'#12324A',border:'1px solid rgba(18,50,74,0.12)'}}>
            {total} <span className="font-medium" style={{color:'#5B6674'}}>leads</span>
          </span>
        </div>

        {/* Divider */}
        <div className="h-px" style={{backgroundColor:'#F1EEE7'}} />

        {/* Row 2: status tabs + score slider + sort */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Status tabs */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{backgroundColor:'#F1EEE7'}}>
            {STATUSES.map((s) => {
              const count = stats?.statusCounts?.[s] ?? null;
              const isActive = statusF === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusF(s)}
                  className={`flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
                    isActive ? STATUS_ACTIVE[s] : ''
                  }`}
                  style={!isActive ? {color:'#5B6674'} : {}}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                  {count !== null && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                      style={isActive
                        ? {backgroundColor:'rgba(255,255,255,0.25)',color:'#fff'}
                        : {backgroundColor:'#E6E0D7',color:'#5B6674'}
                      }
                    >
                      {count.toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Min score */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium whitespace-nowrap" style={{color:'#5B6674'}}>Score ≥</span>
            <input
              type="range" min={0} max={9} step={1}
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              onMouseUp={(e) => setMinScore(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => setMinScore(Number((e.target as HTMLInputElement).value))}
              className="w-16 sm:w-20"
              style={{accentColor:'#6FA8A3'}}
            />
            <span
              className="w-7 text-center text-[11px] font-bold"
              style={{color: sliderVal >= 8 ? '#5F9792' : sliderVal >= 6 ? '#C9A84C' : '#5B6674'}}
            >
              {sliderVal === 0 ? 'Any' : `${sliderVal}+`}
            </span>
          </div>

          {/* Sort toggle */}
          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowDownUp className="h-3 w-3 shrink-0" strokeWidth={2} style={{color:'#5B6674'}} />
            <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{backgroundColor:'#F1EEE7'}}>
              <button
                onClick={() => setSortBy('score')}
                className="flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-semibold transition-all duration-150"
                style={sortBy === 'score'
                  ? {backgroundColor:'#12324A',color:'#fff',boxShadow:'0 1px 3px rgba(18,50,74,0.2)'}
                  : {color:'#5B6674'}}
              >
                <TrendingUp className="h-3 w-3" strokeWidth={2} />
                <span className="hidden sm:inline">Top </span>Score
              </button>
              <button
                onClick={() => setSortBy('recent')}
                className="flex items-center gap-1 rounded-md px-2 sm:px-2.5 py-1 text-[11px] font-semibold transition-all duration-150"
                style={sortBy === 'recent'
                  ? {backgroundColor:'#6FA8A3',color:'#fff',boxShadow:'0 1px 3px rgba(111,168,163,0.3)'}
                  : {color:'#5B6674'}}
              >
                <Clock className="h-3 w-3" strokeWidth={2} />
                Recent
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Post list */}
      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-xl" style={{backgroundColor:'#F1EEE7'}} />
          ))}
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center" style={{borderColor:'rgba(220,38,38,0.3)',backgroundColor:'rgba(220,38,38,0.03)'}}>
          <p className="text-sm font-semibold" style={{color:'#DC2626'}}>Failed to load posts</p>
          <p className="mt-1 text-xs" style={{color:'#5B6674'}}>Server may be busy — try again in a moment</p>
          <button onClick={() => fetchPosts(1)} className="mt-3 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition" style={{backgroundColor:'#12324A'}}>Retry</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center" style={{borderColor:'#E6E0D7',backgroundColor:'#FFFFFF'}}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{backgroundColor:'#F1EEE7'}}>
            <SearchX className="h-6 w-6" strokeWidth={1.5} style={{color:'#5B6674'}} />
          </div>
          {(() => {
            const platformLabel: Record<string, string> = {
              TWITTER: 'X / Twitter', FACEBOOK: 'Facebook',
              QUORA: 'Quora', REDDIT: 'Reddit', ALL: 'All platforms',
            };
            const label = platformLabel[platform] ?? platform;

            // How many posts exist for this platform regardless of score filter?
            // Use totalByPlatform (all posts, scored + unscored) not platformBreakdown (scored only).
            const rawCount = platform === 'ALL'
              ? (stats?.totalPosts ?? 0)
              : (stats?.totalByPlatform?.find((p) => p.platform === platform)?.count ?? 0);

            // Case 1 — Platform selected but ZERO posts ever fetched
            if (platform !== 'ALL' && rawCount === 0) {
              return (
                <>
                  <p className="mt-3 text-sm font-semibold" style={{color:'#12324A'}}>No {label} posts fetched yet</p>
                  <p className="mt-1 text-xs" style={{color:'#5B6674'}}>
                    Click <strong>Run Cycle</strong> in the header to start fetching {label} leads
                  </p>
                </>
              );
            }

            // Case 2 — Posts exist but score filter is hiding them (common for Reddit/Quora)
            if (minScore > 0 && rawCount > 0) {
              return (
                <>
                  <p className="mt-3 text-sm font-semibold" style={{color:'#12324A'}}>{label} posts are pending AI scoring</p>
                  <p className="mt-1 text-xs" style={{color:'#5B6674'}}>
                    Set Score ≥ to <strong>Any</strong> to see all {rawCount} fetched posts,
                    or click <strong>Run Cycle</strong> to score them now
                  </p>
                </>
              );
            }

            // Case 3 — Generic no-match
            return (
              <>
                <p className="mt-3 text-sm font-semibold" style={{color:'#12324A'}}>No leads match these filters</p>
                <p className="mt-1 text-xs" style={{color:'#5B6674'}}>Try lowering the min score or selecting a different platform</p>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => fetchPosts(page - 1)}
            disabled={page <= 1}
            className="rounded-lg px-3 py-1.5 text-[11px] font-medium disabled:opacity-30 transition-colors"
            style={{border:'1px solid #E6E0D7',color:'#5B6674',backgroundColor:'#FFFFFF'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#F1EEE7'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#FFFFFF'}}
          >
            ← Previous
          </button>
          <span className="text-[11px] font-medium" style={{color:'#5B6674'}}>Page {page} of {totalPages}</span>
          <button
            onClick={() => fetchPosts(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg px-3 py-1.5 text-[11px] font-medium disabled:opacity-30 transition-colors"
            style={{border:'1px solid #E6E0D7',color:'#5B6674',backgroundColor:'#FFFFFF'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#F1EEE7'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#FFFFFF'}}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
