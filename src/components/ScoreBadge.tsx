'use client';

interface Props {
  score: number | null;
  size?: 'sm' | 'md';
}

const TIER = (score: number) =>
  score >= 8
    ? { bg:'rgba(111,168,163,0.13)', border:'rgba(111,168,163,0.40)', text:'#3D8C87', dot:'#6FA8A3', label:'High' }
    : score >= 6
    ? { bg:'rgba(201,168,76,0.12)',  border:'rgba(201,168,76,0.40)',  text:'#9A7A20', dot:'#C9A84C', label:'Good' }
    : score >= 4
    ? { bg:'rgba(229,124,58,0.11)',  border:'rgba(229,124,58,0.38)',  text:'#B8541A', dot:'#E57C3A', label:'Low'  }
    : { bg:'rgba(220,38,38,0.09)',   border:'rgba(220,38,38,0.30)',   text:'#B91C1C', dot:'#DC2626', label:'Skip' };

export function ScoreBadge({ score, size = 'sm' }: Props) {
  if (score === null) {
    return (
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
        style={{backgroundColor:'rgba(91,102,116,0.08)',border:'1px solid rgba(91,102,116,0.18)',color:'#8A97A5'}}
      >
        —
      </span>
    );
  }

  const t = TIER(score);

  if (size === 'md') {
    return (
      <div
        className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2"
        style={{backgroundColor:t.bg, border:`1px solid ${t.border}`}}
      >
        <span className="text-[22px] font-extrabold leading-none" style={{color:t.text}}>{score}</span>
        <span className="text-[8px] font-bold uppercase tracking-widest" style={{color:t.dot}}>
          {t.label}
        </span>
      </div>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
      style={{backgroundColor:t.bg, border:`1px solid ${t.border}`, color:t.text}}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
        style={{backgroundColor:t.dot}}
      />
      {score}<span className="font-normal opacity-60 text-[10px]">/10</span>
    </span>
  );
}
