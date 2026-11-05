import type { Metadata } from 'next';
import { Connections } from '@/components/assistente/connections';

export const metadata: Metadata = { title: 'Conexões MCP' };

export default function ConnectionsPage() {
  return <Connections />;
}
