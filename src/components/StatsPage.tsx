'use client';

import { useEffect, useState } from 'react';
import { FileText, Brain, TrendingUp, Clock, ExternalLink, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { PlatformBadge } from './PlatformBadge';
import { ScoreBadge } from './ScoreBadge';

interface StatsData {
  totalPosts:      number;
  scoredPosts:     number;
  highIntentPosts: number;
  pendingPosts:    number;
  avgScore:        number;
  platformBreakdown: { platform: string; count: number; avgScore: number }[];
  scoreDistribution: { score: number | null; count: number }[];
  recentHighIntent:  {
    id: string; platform: string; postText: string | null;
    intentScore: number | null; keywordMatched: string | null; sourceUrl: string | null;
  }[];
  pipeline: {
    lastCycleAt:  string | null;
    totalCycles:  number;
    recentErrors: number;
  };
}

export function StatsPage() {
  const [data,    setData]    = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxScore = Math.max(...data.scoreDistribution.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6">

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatsCard label="Total Posts"    value={data.totalPosts}      sub="all platforms"    accent="blue"  icon={FileText}   />
        <StatsCard label="AI Scored"      value={data.scoredPosts}     sub="Groq LLaMA 3.3"   accent="gray"  icon={Brain}      />
        <StatsCard label="High Intent"    value={data.highIntentPosts} sub="score ≥ 6"        accent="green" icon={TrendingUp} />
        <StatsCard label="Pending Review" value={data.pendingPosts}    sub="awaiting action"  accent="amber" icon={Clock}      />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Score distribution */}
        <div className="rounded-xl p-5 transition-shadow hover:shadow-md" style={{border:'1px solid #E6E0D7',backgroundColor:'#FFFFFF',boxShadow:'0 1px 4px rgba(18,50,74,0.05)'}}>
          <div className="flex items-center gap-2 mb-5">
            <h3 className="text-[13px] font-bold" style={{color:'#12324A'}}>Score Distribution</h3>
            <div className="flex-1 h-px" style={{backgroundColor:'#F1EEE7'}} />
            <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{backgroundColor:'rgba(18,50,74,0.05)',border:'1px solid rgba(18,50,74,0.12)',color:'#5B6674'}}>avg {data.avgScore} / 10</span>
          </div>
          <div className="flex items-end gap-1.5 h-36">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
              const bucket = data.scoreDistribution.find((d) => d.score === score);
              const count  = bucket?.count ?? 0;
              const height = Math.round((count / maxScore) * 100);
              const color  =
                score >= 8 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' :
                score >= 6 ? 'bg-gradient-to-t from-amber-500 to-amber-400'     :
                score >= 4 ? 'bg-gradient-to-t from-orange-500 to-orange-400'   :
                             'bg-gradient-to-t from-red-500 to-red-400';
              return (
                <div key={score} className="flex flex-1 flex-col items-center gap-1">
                  {count > 0 && (
                    <span className="text-[9px] font-bold" style={{color:'#5B6674'}}>{count}</span>
                  )}
                  <div
                    className={`w-full rounded-t ${color} transition-all shadow-sm`}
                    style={{ height: count > 0 ? `${Math.max(height, 6)}%` : '2px', opacity: count > 0 ? 1 : 0.12 }}
                  />
                  <span className="text-[9px] font-medium" style={{color:'#8A97A5'}}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="rounded-xl p-5 transition-shadow hover:shadow-md" style={{border:'1px solid #E6E0D7',backgroundColor:'#FFFFFF',boxShadow:'0 1px 4px rgba(18,50,74,0.05)'}}>
          <div className="flex items-center gap-2 mb-5">
            <h3 className="text-[13px] font-bold" style={{color:'#12324A'}}>Platform Breakdown</h3>
            <div className="flex-1 h-px" style={{backgroundColor:'#F1EEE7'}} />
          </div>
          <div className="flex flex-col gap-4">
            {data.platformBreakdown.length === 0 ? (
              <p className="text-xs text-center py-4" style={{color:'#5B6674'}}>No scored posts yet</p>
            ) : (
              data.platformBreakdown.map((p) => {
                const total = data.scoredPosts || 1;
                const pct   = Math.round((p.count / total) * 100);
                const barColor =
                  p.platform === 'TWITTER'  ? 'bg-gradient-to-r from-slate-800 to-slate-600'   :
                  p.platform === 'FACEBOOK' ? 'bg-gradient-to-r from-blue-600 to-blue-500'     :
                                             'bg-gradient-to-r from-rose-600 to-rose-500';
                return (
                  <div key={p.platform} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <PlatformBadge platform={p.platform as any} />
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold" style={{color:'#12324A'}}>{pct}%</span>
                        <span className="text-[11px]" style={{color:'#5B6674'}}>{p.count} posts · avg <span className="font-semibold" style={{color:'#1B2430'}}>{p.avgScore}</span></span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{backgroundColor:'#F1EEE7'}}>
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Health */}
      <div className="rounded-xl p-5 transition-shadow hover:shadow-md" style={{border:'1px solid #E6E0D7',backgroundColor:'#FFFFFF',boxShadow:'0 1px 4px rgba(18,50,74,0.05)'}}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[13px] font-bold" style={{color:'#12324A'}}>Pipeline Health</h3>
          <div className="flex-1 h-px" style={{backgroundColor:'#F1EEE7'}} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{backgroundColor:'rgba(18,50,74,0.07)'}}>
              <RefreshCw className="h-4 w-4" style={{color:'#12324A'}} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{color:'#5B6674'}}>Total Cycles</p>
              <p className="text-lg font-bold" style={{color:'#1B2430'}}>{data.pipeline.totalCycles}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{backgroundColor:'rgba(111,168,163,0.10)'}}>
              <Activity className="h-4 w-4" style={{color:'#6FA8A3'}} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{color:'#5B6674'}}>Last Cycle</p>
              <p className="text-[13px] font-semibold" style={{color:'#12324A'}}>
                {data.pipeline.lastCycleAt
                  ? new Date(data.pipeline.lastCycleAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Never'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{backgroundColor: data.pipeline.recentErrors > 0 ? 'rgba(220,38,38,0.08)' : '#F1EEE7'}}>
              <AlertCircle className="h-4 w-4" style={{color: data.pipeline.recentErrors > 0 ? '#DC2626' : '#C8CDD4'}} strokeWidth={2} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{color:'#5B6674'}}>API Errors</p>
              <p className="text-lg font-bold" style={{color: data.pipeline.recentErrors > 0 ? '#DC2626' : '#1B2430'}}>
                {data.pipeline.recentErrors}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent high-intent leads */}
      <div className="rounded-xl p-5 transition-shadow hover:shadow-md" style={{border:'1px solid #E6E0D7',backgroundColor:'#FFFFFF',boxShadow:'0 1px 4px rgba(18,50,74,0.05)'}}>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-[13px] font-bold" style={{color:'#12324A'}}>Recent High-Intent Leads</h3>
          <div className="flex-1 h-px" style={{backgroundColor:'#F1EEE7'}} />
          <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{backgroundColor:'rgba(111,168,163,0.10)',border:'1px solid rgba(111,168,163,0.30)',color:'#5F9792'}}>Score ≥ 6</span>
        </div>
        {data.recentHighIntent.length === 0 ? (
          <p className="text-xs text-center py-6" style={{color:'#5B6674'}}>Run the cycle script to populate leads</p>
        ) : (
          <div className="flex flex-col" style={{borderTop:'1px solid #F1EEE7'}}>
            {data.recentHighIntent.map((post) => (
              <div key={post.id} className="flex flex-wrap items-start gap-3 py-3 group/item" style={{borderBottom:'1px solid #F1EEE7'}}>
                <ScoreBadge score={post.intentScore} />
                <PlatformBadge platform={post.platform as any} />
                <p className="flex-1 text-[12px] line-clamp-2 min-w-0 transition-colors" style={{color:'#5B6674'}}>
                  {post.postText ?? '—'}
                </p>
                {post.sourceUrl && (
                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg transition-all"
                    style={{color:'#5B6674'}}
                  >
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
