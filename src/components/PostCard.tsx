'use client';

import { useState } from 'react';
import { ExternalLink, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ScoreBadge } from './ScoreBadge';
import { PlatformBadge } from './PlatformBadge';
import { AICommentBox } from './AICommentBox';

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

interface Props {
  post:      Post;
  onAction:  (id: string, status: 'DONE' | 'SKIPPED') => void;
}

export function PostCard({ post, onAction }: Props) {
  const [loading, setLoading] = useState<'DONE' | 'SKIPPED' | null>(null);

  async function handleAction(status: 'DONE' | 'SKIPPED') {
    setLoading(status);
    try {
      await fetch(`/api/posts/${post.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      });
      onAction(post.id, status);
    } finally {
      setLoading(null);
    }
  }

  const text    = post.postText ?? '';
  const preview = text.length > 280 ? text.slice(0, 280) + '…' : text;
  const domain  = post.sourceUrl ? (() => { try { return new URL(post.sourceUrl).hostname.replace('www.', ''); } catch { return post.sourceUrl; } })() : null;

  const score = post.intentScore ?? 0;
  const cardBorder =
    score >= 8 ? '#A8D5C2' :
    score >= 6 ? '#D7C39A' :
    score >= 4 ? '#E6C9A3' :
                 '#E6E0D7';
  const scorePanelBg =
    score >= 8 ? 'rgba(111,168,163,0.07)' :
    score >= 6 ? 'rgba(201,168,76,0.07)'  :
    score >= 4 ? 'rgba(230,193,163,0.10)' :
                 'rgba(230,224,215,0.30)';

  return (
    <div
      className="group flex gap-0 rounded-xl bg-white overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${cardBorder}`,
        boxShadow: '0 1px 4px rgba(18,50,74,0.05)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow='0 4px 16px rgba(18,50,74,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow='0 1px 4px rgba(18,50,74,0.05)')}
    >

      {/* Score panel — left accent strip */}
      <div
        className="flex w-[52px] sm:w-[68px] shrink-0 flex-col items-center justify-center gap-0.5"
        style={{background:scorePanelBg, borderRight:`1px solid ${cardBorder}`}}
      >
        <ScoreBadge score={post.intentScore} size="md" />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <PlatformBadge platform={post.platform} />
            {post.keywordMatched && (
              <span className="rounded-md px-2 py-0.5 text-[11px] font-medium" style={{backgroundColor:'rgba(18,50,74,0.06)',color:'#12324A',border:'1px solid rgba(18,50,74,0.12)'}}>
                {post.keywordMatched}
              </span>
            )}
          </div>
          <span className="shrink-0 text-[11px] font-medium" style={{color:'#5B6674'}}>
            {new Date(post.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Post text */}
        <p className="mt-2.5 text-[13px] leading-relaxed line-clamp-3" style={{color:'#1B2430'}}>{preview}</p>

        {/* Matched keywords */}
        {(post.matchedKeywords ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(post.matchedKeywords ?? []).map((kw) => (
              <span key={kw} className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{backgroundColor:'rgba(111,168,163,0.12)',color:'#5F9792',border:'1px solid rgba(111,168,163,0.25)'}}>
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* AI reason */}
        {post.aiReason && (
          <div className="mt-2.5 flex items-start gap-1.5 rounded-md px-2.5 py-2" style={{backgroundColor:'rgba(18,50,74,0.03)',border:'1px solid rgba(18,50,74,0.08)'}}>
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2} style={{color:'#6FA8A3'}} />
            <p className="text-[11px] leading-relaxed" style={{color:'#5B6674'}}>{post.aiReason}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between gap-3 pt-3" style={{borderTop:'1px solid #F1EEE7'}}>
          {post.sourceUrl && domain ? (
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] transition-colors truncate"
              style={{color:'#5B6674'}}
              onMouseEnter={e=>(e.currentTarget.style.color='#12324A')}
              onMouseLeave={e=>(e.currentTarget.style.color='#5B6674')}
            >
              <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={2} />
              <span className="truncate">{domain}</span>
            </a>
          ) : <span />}

          <div className="flex items-center gap-1.5 shrink-0">
            {post.status === 'PENDING' ? (
              <>
                <button
                  onClick={() => handleAction('SKIPPED')}
                  disabled={!!loading}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium disabled:opacity-40 transition-all"
                  style={{border:'1px solid #E6E0D7',color:'#5B6674',backgroundColor:'transparent'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#F1EEE7'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='transparent'}}
                >
                  {loading === 'SKIPPED'
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <XCircle className="h-3 w-3" strokeWidth={2} />}
                  Skip
                </button>
                <button
                  onClick={() => handleAction('DONE')}
                  disabled={!!loading}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40 transition-all"
                  style={{backgroundColor:'#12324A'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#0F2A3E'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#12324A'}}
                >
                  {loading === 'DONE'
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />}
                  Done
                </button>
              </>
            ) : post.status === 'DONE' ? (
              <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{backgroundColor:'rgba(111,168,163,0.12)',color:'#5F9792',border:'1px solid rgba(111,168,163,0.3)'}}>
                <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} /> Done
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{backgroundColor:'#F1EEE7',color:'#5B6674',border:'1px solid #E6E0D7'}}>
                <XCircle className="h-3 w-3" strokeWidth={2} /> Skipped
              </span>
            )}
          </div>
        </div>

        {/* AI Comment Box — only for Done posts */}
        {post.status === 'DONE' && (
          <AICommentBox post={post} />
        )}
      </div>
    </div>
  );
}
