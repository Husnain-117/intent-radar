import { Suspense } from 'react';
import { LeadBoard } from '@/components/LeadBoard';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard — LeadPulse CA' };

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex flex-col gap-3 p-6">{[...Array(4)].map((_, i) => <div key={i} className="h-[120px] animate-pulse rounded-xl bg-slate-100" />)}</div>}>
      <LeadBoard />
    </Suspense>
  );
}
