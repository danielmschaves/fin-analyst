import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { REFERENCE_DATE, assetIndex, mockUser } from '@/lib/mock/assets';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell assets={assetIndex} user={mockUser} referenceDate={REFERENCE_DATE}>
      {children}
    </AppShell>
  );
}
