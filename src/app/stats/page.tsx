import { StatsPage as StatsView } from '@/components/StatsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Stats — LeadPulse CA' };

export default function StatsPage() {
  return <StatsView />;
}
