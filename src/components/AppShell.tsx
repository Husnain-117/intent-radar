'use client';

import { usePathname } from 'next/navigation';
import { Activity, X } from 'lucide-react';
import { NavLinks } from './NavLinks';
import { DynamicHeader } from './DynamicHeader';
import { useState } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith('/login')) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{backgroundColor:'var(--bg)'}}>

      {/* ── Mobile backdrop ─────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      {/* Desktop: always visible. Mobile: slide-in drawer over content. */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[220px] shrink-0 flex-col
          transition-transform duration-200 ease-in-out
          md:relative md:z-auto md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{background:'linear-gradient(180deg,#12324A 0%,#0F2A3E 100%)'}}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.08]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10" style={{background:'linear-gradient(135deg,#6FA8A3 0%,#5F9792 100%)'}}>
            <Activity style={{height:'18px',width:'18px',color:'white'}} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-white leading-none tracking-tight">LeadPulse</p>
            <p className="text-[9px] font-semibold leading-none mt-[5px] tracking-[0.15em] uppercase" style={{color:'#D7C39A'}}>CA · Intelligence</p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setOpen(false)}
            className="md:hidden flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Navigation */}
        <NavLinks onNavigate={() => setOpen(false)} />

        {/* System status + logout footer */}
        <div className="border-t border-white/[0.06] px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{backgroundColor:'#6FA8A3'}} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{backgroundColor:'#6FA8A3'}} />
            </span>
            <span className="text-[11px]" style={{color:'rgba(111,168,163,0.7)'}}>System live · v1.0</span>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-1.5 text-left text-[11px] hover:bg-white/[0.06] transition"
              style={{color:'rgba(215,195,154,0.6)'}}
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DynamicHeader onMenuOpen={() => setOpen(true)} />
        <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
      </main>

    </div>
  );
}
