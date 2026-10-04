'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Loader2, Lock, Mail, Activity } from 'lucide-react';
import { Suspense } from 'react';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get('next') ?? '/dashboard';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password: password.trim(),
    });

    if (authError) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden"
      style={{background:'linear-gradient(135deg,#0C1E2E 0%,#0F2A3E 55%,#12324A 100%)'}}
    >
      {/* Decorative ambient glows */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-72 w-72 rounded-full blur-3xl"
        style={{backgroundColor:'rgba(111,168,163,0.12)'}} />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full blur-3xl"
        style={{backgroundColor:'rgba(215,195,154,0.07)'}} />

      <div className="relative w-full max-w-sm">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-9">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
            style={{
              background:'linear-gradient(135deg,#6FA8A3 0%,#12324A 100%)',
              boxShadow:'0 8px 32px rgba(111,168,163,0.30)',
            }}
          >
            <Activity className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-white">LeadPulse CA</h1>
          <p className="mt-1 text-[12px] font-medium tracking-widest uppercase" style={{color:'rgba(215,195,154,0.70)'}}>
            Social Intent Intelligence
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.09)',
            backdropFilter:'blur(16px)',
          }}
        >
          <p className="mb-5 text-[13px] font-semibold text-white">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{color:'rgba(111,168,163,0.85)'}}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{color:'rgba(255,255,255,0.28)'}} />
                <input
                  type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  style={{backgroundColor:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)'}}
                  onFocus={e=>{e.currentTarget.style.borderColor='rgba(111,168,163,0.55)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(111,168,163,0.12)'}}
                  onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.10)';e.currentTarget.style.boxShadow='none'}}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{color:'rgba(111,168,163,0.85)'}}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                  style={{color:'rgba(255,255,255,0.28)'}} />
                <input
                  type="password" required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  style={{backgroundColor:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.10)'}}
                  onFocus={e=>{e.currentTarget.style.borderColor='rgba(111,168,163,0.55)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(111,168,163,0.12)'}}
                  onBlur={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.10)';e.currentTarget.style.boxShadow='none'}}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="rounded-xl px-3 py-2.5 text-[12px] font-medium text-center"
                style={{backgroundColor:'rgba(220,38,38,0.10)',border:'1px solid rgba(220,38,38,0.22)',color:'#FCA5A5'}}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-55"
              style={{
                background:'linear-gradient(135deg,#6FA8A3 0%,#12324A 100%)',
                boxShadow:'0 4px 18px rgba(111,168,163,0.28)',
              }}
              onMouseEnter={e=>{if(!loading)(e.currentTarget as HTMLButtonElement).style.boxShadow='0 6px 24px rgba(111,168,163,0.40)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.boxShadow='0 4px 18px rgba(111,168,163,0.28)'}}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              ) : 'Sign in →'}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-wide" style={{color:'rgba(255,255,255,0.22)'}}>
          Internal use only · LeadPulse CA v1.0
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{background:'linear-gradient(135deg,#0C1E2E 0%,#12324A 100%)'}}>
        <Loader2 className="h-6 w-6 animate-spin" style={{color:'#6FA8A3'}} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
