'use client';

import type { LucideIcon } from 'lucide-react';

interface Props {
  label:   string;
  value:   string | number;
  sub?:    string;
  accent?: 'blue' | 'green' | 'amber' | 'gray';
  icon?:   LucideIcon;
}

const ACCENT: Record<string, {borderColor:string; gradFrom:string; iconBg:string; iconColor:string; numColor:string}> = {
  blue:  {
    borderColor: '#12324A',
    gradFrom:    'rgba(18,50,74,0.04)',
    iconBg:      'rgba(18,50,74,0.08)',
    iconColor:   '#12324A',
    numColor:    '#12324A',
  },
  green: {
    borderColor: '#6FA8A3',
    gradFrom:    'rgba(111,168,163,0.06)',
    iconBg:      'rgba(111,168,163,0.12)',
    iconColor:   '#6FA8A3',
    numColor:    '#5F9792',
  },
  amber: {
    borderColor: '#C9A84C',
    gradFrom:    'rgba(201,168,76,0.06)',
    iconBg:      'rgba(201,168,76,0.12)',
    iconColor:   '#C9A84C',
    numColor:    '#C9A84C',
  },
  gray:  {
    borderColor: '#5B6674',
    gradFrom:    'rgba(91,102,116,0.04)',
    iconBg:      'rgba(91,102,116,0.08)',
    iconColor:   '#5B6674',
    numColor:    '#1B2430',
  },
};

export function StatsCard({ label, value, sub, accent = 'gray', icon: Icon }: Props) {
  const c = ACCENT[accent];
  return (
    <div
      className="relative overflow-hidden rounded-xl border-l-4 px-5 py-4 transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6E0D7',
        borderLeftColor: c.borderColor,
        borderLeftWidth: '4px',
        background: `linear-gradient(135deg,${c.gradFrom} 0%,#FFFFFF 100%)`,
        boxShadow: '0 1px 4px rgba(18,50,74,0.06)',
      }}
    >
      {Icon && (
        <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{backgroundColor: c.iconBg}}>
          <Icon className="h-5 w-5" style={{color: c.iconColor}} strokeWidth={1.8} />
        </div>
      )}
      <p className="text-[10px] font-bold uppercase tracking-widest pr-14" style={{color:'#5B6674'}}>{label}</p>
      <p className="mt-2 text-[2.1rem] font-extrabold leading-none tracking-tight" style={{color: c.numColor}}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] font-medium" style={{color:'#5B6674'}}>{sub}</p>}
    </div>
  );
}
