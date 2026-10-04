'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, Settings2, type LucideIcon } from 'lucide-react';

interface NavItem {
  href:    string;
  label:   string;
  icon:    LucideIcon;
  section: string;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Workspace' },
  { href: '/stats',     label: 'Analytics', icon: BarChart3,       section: 'Workspace' },
  { href: '/settings',  label: 'Settings',  icon: Settings2,       section: 'System'    },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname  = usePathname();
  const sections  = Array.from(new Set(NAV.map((n) => n.section)));

  return (
    <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-5">
      {sections.map((section) => (
        <div key={section}>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            {section}
          </p>
          <div className="space-y-0.5">
            {NAV.filter((n) => n.section === section).map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150 ${
                    active
                      ? 'text-white'
                      : 'hover:bg-white/[0.05] hover:text-slate-200'
                  }`}
                  style={active ? {background:'rgba(111,168,163,0.15)',color:'#fff'} : {color:'rgba(255,255,255,0.45)'}}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-[3px] rounded-r-full" style={{backgroundColor:'#6FA8A3',boxShadow:'0 0 8px rgba(111,168,163,0.5)'}} />
                  )}
                  <Icon
                    className="h-[15px] w-[15px] shrink-0 transition-colors"
                    style={active ? {color:'#6FA8A3'} : {color:'rgba(255,255,255,0.35)'}}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
