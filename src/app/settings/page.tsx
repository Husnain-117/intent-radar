import { SettingsPage as SettingsView } from '@/components/SettingsPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings — LeadPulse CA' };

export default function SettingsPage() {
  return <SettingsView />;
}
