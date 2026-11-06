import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { getAssetRepository, getAssistantProvider } from '@/lib/repositories';
import { getCurrentUser, getRequestContext } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getRequestContext();
  const assets = getAssetRepository();
  const [user, assetIndex, dataDate, connections] = await Promise.all([
    getCurrentUser(),
    assets.listAssets(ctx),
    assets.getDataDate(ctx),
    getAssistantProvider().listConnections(ctx),
  ]);
  return (
    <AppShell assets={assetIndex} user={user} referenceDate={dataDate} connections={connections}>
      {children}
    </AppShell>
  );
}
