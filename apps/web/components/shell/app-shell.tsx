'use client';

import { ChevronLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState, type ReactNode } from 'react';
import { Disclaimer } from '@/components/painel/disclaimer';
import { Toaster } from '@/components/painel/toaster';
import type { AssetSummary, User } from '@/lib/contracts';
import { useAsk } from '@/lib/ask';
import { formatDate, formatMonthShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AssistantStateProvider, useAssistant } from '@/components/assistente/assistant-context';
import { AssistantDrawer } from '@/components/assistente/assistant-drawer';
import { CommandBar, CommandTrigger, useCommandShortcut } from './command-bar';
import { IconIA } from './icons';
import { mobileTitle } from './nav-items';
import { BottomNav, Sidebar } from './sidebar';
import { UserMenu } from './user-menu';

function DataDate({ date }: { date: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-caption whitespace-nowrap text-muted-foreground">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-positive" />
      Dados de {formatDate(date)}
    </span>
  );
}

type ShellProps = {
  children: ReactNode;
  assets: AssetSummary[];
  user: User;
  referenceDate: string;
};

export function AppShell(props: ShellProps) {
  return (
    <AssistantStateProvider>
      <Shell {...props} />
    </AssistantStateProvider>
  );
}

function Shell({ children, assets, user, referenceDate }: ShellProps) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const ask = useAsk();
  const { open: assistantOpen } = useAssistant();
  const openCommand = useCallback(() => setCommandOpen(true), []);
  useCommandShortcut(openCommand);
  const isAsset = pathname.startsWith('/ativo/');

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-accent px-3 py-2 text-accent-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <div className="flex min-h-dvh">
        <Sidebar />
        {/* Com o assistente aberto, o conteúdo dá lugar à coluna de 400 px (como na prancha P2-A-IA). */}
        <div className={cn('flex min-w-0 flex-1 flex-col', assistantOpen && 'md:pr-[400px]')}>
          {/* Topo desktop */}
          <header className="hidden flex-wrap items-center gap-x-5 gap-y-3 border-b border-border px-10 py-3 md:flex">
            <CommandTrigger onOpen={openCommand} />
            <span className="ml-auto">
              <DataDate date={referenceDate} />
            </span>
            <UserMenu name={user.name} email={user.email} />
          </header>
          {/* Topo mobile */}
          <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-border bg-background px-2 py-1 md:hidden">
            {isAsset ? (
              <Link
                href="/carteira"
                aria-label="Voltar"
                className="inline-grid size-11 place-items-center rounded-full text-foreground"
              >
                <ChevronLeft className="size-5" strokeWidth={1.75} />
              </Link>
            ) : (
              <span className="w-3" aria-hidden="true" />
            )}
            <span className="tnum flex-1 text-body font-semibold">{mobileTitle(pathname)}</span>
            <button
              type="button"
              aria-label="Perguntar à IA"
              onClick={() => ask({ context: [] })}
              className="inline-grid size-11 cursor-pointer place-items-center rounded-full text-secondary-foreground"
            >
              <IconIA />
            </button>
            <button
              type="button"
              aria-label="Buscar ativo"
              onClick={openCommand}
              className="inline-grid size-11 cursor-pointer place-items-center rounded-full text-secondary-foreground"
            >
              <Search className="size-[18px]" strokeWidth={1.75} />
            </button>
            <UserMenu name={user.name} email={user.email} />
          </header>
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pt-5 pb-10 md:gap-12 md:px-10 md:pt-10 md:pb-12">
            <main
              id="conteudo"
              tabIndex={-1}
              className="flex min-w-0 flex-col gap-10 outline-none md:gap-12"
            >
              {children}
            </main>
            <Disclaimer />
          </div>
          <BottomNav />
        </div>
      </div>
      <CommandBar open={commandOpen} onOpenChange={setCommandOpen} assets={assets} />
      <AssistantDrawer monthLabel={formatMonthShort(referenceDate, { fullYear: true })} />
      <Toaster />
    </>
  );
}
