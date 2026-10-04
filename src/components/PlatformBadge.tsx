'use client';

type Platform = 'TWITTER' | 'FACEBOOK' | 'QUORA' | 'REDDIT';

interface Props { platform: Platform }

const CONFIG: Record<Platform, { label: string; cls: string }> = {
  TWITTER:  { label: 'X / Twitter', cls: 'bg-slate-800  text-white border border-slate-700'      },
  FACEBOOK: { label: 'Facebook',    cls: 'bg-blue-600   text-white border border-blue-700'       },
  QUORA:    { label: 'Quora',       cls: 'bg-rose-600   text-white border border-rose-700'       },
  REDDIT:   { label: 'Reddit',      cls: 'bg-orange-500 text-white border border-orange-600'     },
};

export function PlatformBadge({ platform }: Props) {
  const c = CONFIG[platform] ?? CONFIG.TWITTER;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${c.cls}`}>
      {c.label}
    </span>
  );
}
