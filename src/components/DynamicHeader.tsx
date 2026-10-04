'use client';

import { usePathname } from 'next/navigation';
import { Zap, Brain, ChevronRight, Menu } from 'lucide-react';
import { useState } from 'react';

const PAGES: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Lead Dashboard',  sub: 'Review and action incoming intent signals' },
  '/stats':     { title: 'Analytics',       sub: 'Pipeline health, score distribution & platform breakdown' },
  '/settings':  { title: 'Settings',        sub: 'Configure fetch engine, AI scoring & API keys' },
};

interface CycleResult { fetched: number; stored: number; scored: number }
interface ScoreResult  { updated: number; processed: number }

export function DynamicHeader({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const pathname = usePathname();
  const page     = PAGES[pathname] ?? { title: 'LeadPulse CA', sub: '' };

  // Run Cycle state
  const [running,     setRunning]     = useState(false);
  const [cycleResult, setCycleResult] = useState<CycleResult | null>(null);

  // Score Backlog state
  const [scoring,       setScoring]       = useState(false);
  const [totalScored,   setTotalScored]   = useState(0);
  const [scoreDone,     setScoreDone]     = useState(false);

  async function triggerCycle() {
    setRunning(true);
    setCycleResult(null);
    try {
      const res  = await fetch('/api/trigger/run', { method: 'POST' });
      const data = await res.json() as CycleResult & { ok: boolean };
      if (data.ok) {
        setCycleResult({ fetched: data.fetched ?? 0, stored: data.stored ?? 0, scored: data.scored ?? 0 });
        setTimeout(() => setCycleResult(null), 6000);
      }
    } finally {
      setRunning(false);
    }
  }

  // Chains repeated POST calls to /api/trigger/score until backlog is clear
  async function scoreBacklog() {
    setScoring(true);
    setTotalScored(0);
    setScoreDone(false);
    let accumulated = 0;

    try {
      while (true) {
        const res  = await fetch('/api/trigger/score', { method: 'POST' });
        const data = await res.json() as ScoreResult & { ok: boolean };
        if (!data.ok) break;
        accumulated += data.updated ?? 0;
        setTotalScored(accumulated);
        // Stop when a run returns 0 new scored posts (backlog is clear)
        if ((data.updated ?? 0) === 0) break;
      }
    } finally {
      setScoring(false);
      setScoreDone(true);
      setTimeout(() => { setScoreDone(false); setTotalScored(0); }, 6000);
    }
  }

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between px-3 sm:px-6 gap-2 sm:gap-4"
      style={{
        background:'linear-gradient(90deg,#FEFCF8 0%,#FFFFFF 100%)',
        borderBottom:'1px solid #E6E0D7',
        boxShadow:'0 1px 0 rgba(111,168,163,0.12)',
      }}
    >

      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="md:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Menu className="h-[18px] w-[18px]" style={{color:'#12324A'}} strokeWidth={2} />
      </button>

      <div className="min-w-0 flex items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold leading-tight truncate" style={{color:'#12324A'}}>{page.title}</h1>
          {page.sub && (
            <p className="text-[11px] leading-tight truncate hidden sm:block" style={{color:'#5B6674'}}>{page.sub}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Live badge */}
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold" style={{borderColor:'rgba(111,168,163,0.35)',backgroundColor:'rgba(111,168,163,0.08)',color:'#6FA8A3'}}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{backgroundColor:'#6FA8A3'}} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{backgroundColor:'#6FA8A3'}} />
          </span>
          Live
        </span>

        {/* Score Backlog — drain all unscored posts */}
        {pathname === '/dashboard' && (
          <button
            onClick={scoreBacklog}
            disabled={scoring || running}
            className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-60"
            style={
              scoreDone  ? {backgroundColor:'rgba(111,168,163,0.12)',color:'#5F9792',border:'1px solid rgba(111,168,163,0.3)'}  :
              scoring    ? {backgroundColor:'rgba(201,168,76,0.10)', color:'#C9A84C', border:'1px solid rgba(201,168,76,0.3)'}   :
                           {backgroundColor:'#F1EEE7',               color:'#5B6674', border:'1px solid #E6E0D7'}
            }
          >
            <Brain className={`h-3.5 w-3.5 ${scoring ? 'animate-pulse' : ''}`} strokeWidth={2} />
            {scoring   ? `Scoring… ${totalScored} done` :
             scoreDone ? `✓ ${totalScored} scored`       :
                         'Score Backlog'}
          </button>
        )}

        {/* Run Cycle — fetch fresh posts + score them */}
        <button
          onClick={triggerCycle}
          disabled={running || scoring}
          className="flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3.5 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-70"
          style={
            cycleResult ? {backgroundColor:'#6FA8A3',color:'#fff',boxShadow:'0 2px 8px rgba(111,168,163,0.3)'}  :
            running     ? {backgroundColor:'#5B6674',color:'#fff'}                                               :
                          {backgroundColor:'#12324A',color:'#fff',boxShadow:'0 2px 8px rgba(18,50,74,0.25)'}
          }
        >
          {cycleResult ? (
            <>
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline">
                {cycleResult.stored > 0
                  ? `+${cycleResult.stored} stored · ${cycleResult.scored} scored`
                  : 'No new posts'}
              </span>
              <span className="sm:hidden">
                {cycleResult.stored > 0 ? `+${cycleResult.stored}` : '—'}
              </span>
            </>
          ) : (
            <>
              <Zap className={`h-3.5 w-3.5 ${running ? 'animate-pulse' : ''}`} strokeWidth={2.5} />
              <span className="hidden sm:inline">{running ? 'Running…' : 'Run Cycle'}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
