'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Settings {
  fetch_interval_hours:  string;
  batch_size_keywords:   string;
  max_keywords_per_run:  string;
  min_intent_score:      string;
  ai_batch_size:         string;
  ai_model:              string;
  auto_score_on_fetch:   string;
  enabled_platforms:     string;
  rapidapi_key:          string;
  groq_api_key:          string;
}

type Toast = { id: number; msg: string; type: 'success' | 'error' };

const AI_MODELS = [
  { value: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B Versatile (recommended)' },
  { value: 'llama-3.1-8b-instant',    label: 'LLaMA 3.1 8B Instant (fastest)' },
  { value: 'mixtral-8x7b-32768',      label: 'Mixtral 8×7B (balanced)' },
  { value: 'gemma2-9b-it',            label: 'Gemma 2 9B (Google)' },
];

const PLATFORMS = ['TWITTER', 'FACEBOOK', 'QUORA', 'REDDIT'] as const;

const SCORE_COLOR = (s: number) =>
  s >= 8 ? 'text-green-600' : s >= 6 ? 'text-amber-600' : s >= 4 ? 'text-orange-500' : 'text-red-500';

// ─── Small helper components ──────────────────────────────────────────────────
function SectionCard({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{border:'1px solid #E6E0D7',backgroundColor:'#FFFFFF',boxShadow:'0 1px 4px rgba(18,50,74,0.05)'}}>
      <div className="px-6 py-4" style={{borderBottom:'1px solid #F1EEE7'}}>
        <h2 className="text-sm font-semibold" style={{color:'#12324A'}}>{title}</h2>
        <p className="mt-0.5 text-xs" style={{color:'#5B6674'}}>{subtitle}</p>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
      <div className="sm:w-52 shrink-0">
        <p className="text-sm font-medium" style={{color:'#1B2430'}}>{label}</p>
        {hint && <p className="mt-0.5 text-xs" style={{color:'#5B6674'}}>{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, min, max }: {
  value: string; onChange: (v: string) => void; min: number; max: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-lg px-3 py-1.5 text-sm outline-none transition-all"
        style={{border:'1px solid #E6E0D7',color:'#1B2430',backgroundColor:'#FFFFFF'}}
        onFocus={e=>{e.currentTarget.style.borderColor='rgba(111,168,163,0.6)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(111,168,163,0.12)'}}
        onBlur={e=>{e.currentTarget.style.borderColor='#E6E0D7';e.currentTarget.style.boxShadow='none'}}
      />
      <span className="text-xs" style={{color:'#5B6674'}}>{min}–{max}</span>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none"
      style={{backgroundColor: checked ? '#6FA8A3' : '#E6E0D7'}}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  );
}

function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-all"
      style={{backgroundColor:'#12324A',boxShadow:'0 2px 6px rgba(18,50,74,0.20)'}}
      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#0F2A3E'}}
      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#12324A'}}
    >
      {loading ? (
        <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving…</>
      ) : (
        <>&#x2713; Save</>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [toasts,   setToasts]   = useState<Toast[]>([]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [cycleRunning,  setCycleRunning]  = useState(false);
  const [resetPending,  setResetPending]  = useState(false);
  const [resetRunning,  setResetRunning]  = useState(false);
  const toastId = useRef(0);

  // Load settings
  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setSettings(d);
      setLoading(false);
    });
  }, []);

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  function set(key: keyof Settings, value: string) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function save(section: string, keys: (keyof Settings)[]) {
    if (!settings) return;
    setSaving(section);
    const payload: Record<string, string> = {};
    for (const k of keys) payload[k] = settings[k];
    const res = await fetch('/api/settings', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(null);
    if (res.ok) toast('Settings saved successfully');
    else        toast(data.error ?? 'Failed to save', 'error');
  }

  async function runCycle() {
    setCycleRunning(true);
    try {
      const res  = await fetch('/api/trigger/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok) toast(`Cycle done — fetched ${data.fetched}, stored ${data.stored}, scored ${data.scored}`);
      else        toast(data.error ?? 'Cycle failed', 'error');
    } catch {
      toast('Cycle failed — check console', 'error');
    } finally {
      setCycleRunning(false);
    }
  }

  async function resetScores() {
    setResetRunning(true);
    try {
      const res  = await fetch('/api/cron/reset-scores', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (res.ok) { toast(`Reset ${data.reset} posts — ready to re-score`); setResetPending(false); }
      else        toast(data.error ?? 'Reset failed', 'error');
    } finally {
      setResetRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5 p-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />)}
      </div>
    );
  }
  if (!settings) return null;

  const platforms: string[] = JSON.parse(settings.enabled_platforms || '["TWITTER","FACEBOOK","QUORA"]');
  const minScore = Number(settings.min_intent_score);

  return (
    <div className="flex flex-col gap-4 p-3 sm:gap-5 sm:p-6 max-w-3xl">

      {/* ── 1. Fetch Engine ───────────────────────────────────── */}
      <SectionCard
        title="Fetch Engine"
        subtitle="Controls how often and how many social posts are collected per cycle."
      >
        <Field label="Fetch interval" hint="How often the cron job runs (hours)">
          <NumberInput value={settings.fetch_interval_hours} onChange={(v) => set('fetch_interval_hours', v)} min={1} max={24} />
        </Field>

        <Field label="Keywords per cycle" hint="Weighted-random keywords fetched each run">
          <NumberInput value={settings.batch_size_keywords} onChange={(v) => set('batch_size_keywords', v)} min={5} max={500} />
        </Field>

        <Field label="Max keywords / run" hint="Hard cap across all platforms">
          <NumberInput value={settings.max_keywords_per_run} onChange={(v) => set('max_keywords_per_run', v)} min={5} max={1000} />
        </Field>

        <Field label="Enabled platforms" hint="Platforms to include in each cycle">
          <div className="flex flex-wrap gap-4">
            {PLATFORMS.map((p) => {
              const on = platforms.includes(p);
              return (
                <label key={p} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const next = on ? platforms.filter((x) => x !== p) : [...platforms, p];
                      set('enabled_platforms', JSON.stringify(next));
                    }}
                    className="accent-[#1A3C5E] h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                </label>
              );
            })}
          </div>
        </Field>

        <Field label="Auto-score on fetch" hint="Immediately run AI scorer after each fetch cycle">
          <Toggle
            checked={settings.auto_score_on_fetch === 'true'}
            onChange={(v) => set('auto_score_on_fetch', String(v))}
          />
        </Field>

        <div className="flex pt-2" style={{borderTop:'1px solid #F1EEE7'}}>
          <SaveButton
            loading={saving === 'fetch'}
            onClick={() => save('fetch', ['fetch_interval_hours','batch_size_keywords','max_keywords_per_run','enabled_platforms','auto_score_on_fetch'])}
          />
        </div>
      </SectionCard>

      {/* ── 2. AI Scoring ────────────────────────────────────── */}
      <SectionCard
        title="AI Scoring"
        subtitle="Configure the Groq-powered intent scoring engine."
      >
        <Field label="Min intent score" hint="Posts below this threshold are dimmed in the dashboard">
          <div className="flex items-center gap-3">
            <input
              type="range" min={1} max={9} step={1}
              value={settings.min_intent_score}
              onChange={(e) => set('min_intent_score', e.target.value)}
              className="w-40 accent-[#1A3C5E]"
            />
            <span className={`w-8 text-center text-xl font-bold leading-none ${SCORE_COLOR(minScore)}`}>
              {minScore}
            </span>
            <span className="text-xs text-gray-400">
              {minScore >= 8 ? 'Very high intent only' :
               minScore >= 6 ? 'High intent (recommended)' :
               minScore >= 4 ? 'Moderate intent' : 'All posts'}
            </span>
          </div>
        </Field>

        <Field label="AI batch size" hint="Posts sent to Groq per API call (larger = fewer calls)">
          <NumberInput value={settings.ai_batch_size} onChange={(v) => set('ai_batch_size', v)} min={5} max={50} />
        </Field>

        <Field label="AI model" hint="Groq model used for scoring">
          <select
            value={settings.ai_model}
            onChange={(e) => set('ai_model', e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm outline-none transition-all w-full max-w-sm"
            style={{border:'1px solid #E6E0D7',color:'#1B2430',backgroundColor:'#FFFFFF'}}
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </Field>

        <div className="flex pt-2" style={{borderTop:'1px solid #F1EEE7'}}>
          <SaveButton
            loading={saving === 'ai'}
            onClick={() => save('ai', ['min_intent_score', 'ai_batch_size', 'ai_model'])}
          />
        </div>
      </SectionCard>

      {/* ── 3. API Keys ──────────────────────────────────────── */}
      <SectionCard
        title="API Keys"
        subtitle="Stored securely in the database. Keys are masked after saving."
      >
        {(['rapidapi_key', 'groq_api_key'] as (keyof Settings)[]).map((key) => {
          const label = key === 'rapidapi_key' ? 'RapidAPI Key' : 'Groq API Key';
          const hint  = key === 'rapidapi_key' ? 'Used for Facebook, Twitter, Quora scrapers' : 'Used for AI intent scoring (gsk_...)';
          return (
            <Field key={key} label={label} hint={hint}>
              <div className="flex gap-2 max-w-sm">
                <input
                  type={showKeys[key] ? 'text' : 'password'}
                  value={settings[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={`Enter ${label}…`}
                  className="flex-1 rounded-lg px-3 py-1.5 text-sm font-mono outline-none transition-all"
                  style={{border:'1px solid #E6E0D7',color:'#1B2430',backgroundColor:'#FFFFFF'}}
                  onFocus={e=>{e.currentTarget.style.borderColor='rgba(111,168,163,0.6)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(111,168,163,0.12)'}}
                  onBlur={e=>{e.currentTarget.style.borderColor='#E6E0D7';e.currentTarget.style.boxShadow='none'}}
                />
                <button
                  type="button"
                  onClick={() => setShowKeys((s) => ({ ...s, [key]: !s[key] }))}
                  className="rounded-lg px-2.5 py-1.5 text-xs transition-colors"
                  style={{border:'1px solid #E6E0D7',color:'#5B6674',backgroundColor:'#FFFFFF'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#F1EEE7'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.backgroundColor='#FFFFFF'}}
                >
                  {showKeys[key] ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
          );
        })}

        <div className="flex pt-2" style={{borderTop:'1px solid #F1EEE7'}}>
          <SaveButton
            loading={saving === 'keys'}
            onClick={() => save('keys', ['rapidapi_key', 'groq_api_key'])}
          />
        </div>
      </SectionCard>

      {/* ── 4. System Actions ────────────────────────────────── */}
      <SectionCard
        title="System Actions"
        subtitle="Manual controls for the pipeline. Use with care."
      >
        {/* Run cycle */}
        <Field label="Run cycle now" hint="Fetch posts + score immediately, same as the cron job">
          <button
            onClick={runCycle}
            disabled={cycleRunning}
            className="flex items-center gap-2 rounded-lg border border-[#1A3C5E] px-4 py-2 text-xs font-semibold text-[#1A3C5E] hover:bg-[#EAF3FB] disabled:opacity-50 transition-colors"
          >
            {cycleRunning ? (
              <><span className="h-3 w-3 animate-spin rounded-full border-2 border-[#1A3C5E] border-t-transparent" />Running cycle…</>
            ) : (
              <>▶ Run Fetch + Score Cycle</>
            )}
          </button>
        </Field>

        {/* Reset scores */}
        <Field label="Reset all scores" hint="Clear AI scores from every post so they can be re-evaluated">
          {!resetPending ? (
            <button
              onClick={() => setResetPending(true)}
              className="rounded-lg border border-red-200 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              Reset All Scores
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-xs text-red-600 font-medium">Are you sure? This cannot be undone.</p>
              <button
                onClick={resetScores}
                disabled={resetRunning}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {resetRunning ? 'Resetting…' : 'Yes, Reset'}
              </button>
              <button
                onClick={() => setResetPending(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </Field>
      </SectionCard>

      {/* ── Toast notifications ───────────────────────────────── */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-lg px-4 py-3 text-sm font-medium shadow-lg pointer-events-auto transition-all text-white"
            style={{backgroundColor: t.type === 'success' ? '#12324A' : '#DC2626',boxShadow: t.type === 'success' ? '0 4px 16px rgba(18,50,74,0.25)' : '0 4px 16px rgba(220,38,38,0.25)'}}
          >
            {t.type === 'success' ? '✓ ' : '✗ '}{t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
