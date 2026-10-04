'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';

interface Post {
  id:              string;
  platform:        string;
  sourceUrl:       string | null;
  generatedComment: string | null;
}

interface Props {
  post: Post;
}

type GenStatus = 'idle' | 'loading' | 'done' | 'error';

const PLATFORM_LIMITS: Record<string, number> = {
  FACEBOOK: 8000,
  TWITTER:  280,
  REDDIT:   10000,
  QUORA:    0,
};

export function AICommentBox({ post }: Props) {
  const [genStatus, setGenStatus] = useState<GenStatus>(
    post.generatedComment ? 'done' : 'idle',
  );
  const [comment, setComment] = useState<string>(post.generatedComment ?? '');
  const [copied,  setCopied]  = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    if (genStatus === 'done') autoResize();
  }, [genStatus, comment]);

  async function handleGenerate() {
    setGenStatus('loading');
    setComment('');
    try {
      const res  = await fetch(`/api/posts/${post.id}/generate-comment`, { method: 'POST' });
      const data = await res.json() as { comment?: string; error?: string };
      if (data.error || !data.comment) throw new Error(data.error ?? 'Empty response');
      setComment(data.comment);
      setGenStatus('done');
    } catch {
      setGenStatus('error');
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(comment);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard not available (http / old browser) — silently ignore
    }
  }

  const limit       = PLATFORM_LIMITS[post.platform] ?? 0;
  const charCount   = comment.length;
  const isOverLimit = limit > 0 && charCount > limit;

  return (
    <div className="mt-3 pt-3" style={{borderTop:'1px solid #F1EEE7'}}>

      {/* Generate button (idle / loading) */}
      {genStatus !== 'done' && (
        <button
          onClick={handleGenerate}
          disabled={genStatus === 'loading'}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{backgroundColor:'#12324A'}}
          onMouseEnter={e=>{if(genStatus!=='loading')(e.currentTarget as HTMLButtonElement).style.backgroundColor='#0F2A3E'}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#12324A'}}
        >
          {genStatus === 'loading' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} /> Generating…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> Generate AI Comment</>
          )}
        </button>
      )}

      {/* Error state */}
      {genStatus === 'error' && (
        <p className="mt-2 text-[12px]" style={{color:'#DC2626'}}>
          Failed to generate comment. Please try again.
        </p>
      )}

      {/* Comment textarea + actions */}
      {genStatus === 'done' && (
        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={(e) => { setComment(e.target.value); autoResize(); }}
            rows={4}
            className="w-full resize-none rounded-lg p-3 text-[13px] leading-relaxed transition focus:outline-none"
            style={{
              backgroundColor:'#FAF7F2',
              border:'1px solid #E6E0D7',
              color:'#1B2430',
            }}
            onFocus={e=>{e.currentTarget.style.borderColor='#6FA8A3';e.currentTarget.style.boxShadow='0 0 0 3px rgba(111,168,163,0.15)'}}
            onBlur={e=>{e.currentTarget.style.borderColor='#E6E0D7';e.currentTarget.style.boxShadow='none'}}
          />

          {/* Character count */}
          <p className="text-[11px]" style={{color: isOverLimit ? '#DC2626' : '#5B6674', fontWeight: isOverLimit ? 600 : 400}}>
            {charCount} characters{limit > 0 ? ` / ${limit.toLocaleString()} limit` : ''}
            {isOverLimit && ' — over limit'}
          </p>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Regenerate */}
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
              style={{border:'1px solid #E6E0D7',color:'#5B6674',backgroundColor:'#FFFFFF'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#F1EEE7'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#FFFFFF'}}
            >
              <RefreshCw className="h-3 w-3" strokeWidth={2} />
              Regenerate
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
              style={copied
                ? {backgroundColor:'#6FA8A3',color:'#fff',border:'1px solid #6FA8A3'}
                : {border:'1px solid #E6E0D7',color:'#5B6674',backgroundColor:'#FFFFFF'}}
              onMouseEnter={e=>{if(!copied)(e.currentTarget as HTMLButtonElement).style.backgroundColor='#F1EEE7'}}
              onMouseLeave={e=>{if(!copied)(e.currentTarget as HTMLButtonElement).style.backgroundColor='#FFFFFF'}}
            >
              {copied
                ? <><Check className="h-3 w-3" strokeWidth={2.5} /> Copied!</>
                : <><Copy className="h-3 w-3" strokeWidth={2} /> Copy Comment</>}
            </button>

            {/* Go to post */}
            {post.sourceUrl && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-all"
                style={{backgroundColor:'#6FA8A3'}}
                onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#5F9792')}
                onMouseLeave={e=>(e.currentTarget.style.backgroundColor='#6FA8A3')}
              >
                <ExternalLink className="h-3 w-3" strokeWidth={2} />
                Go to Post
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
