'use client';

import { Plug } from 'lucide-react';
import { PageHeader } from '@/components/painel/page-header';
import { Section } from '@/components/painel/section';
import { Switch } from '@/components/projecoes/switch';
import { useAsk } from '@/lib/ask';
import { Button } from '@/components/ui/button';
import { IconIA } from '@/components/shell/icons';
import { useAssistant } from './assistant-context';

const STATUS: Record<string, string> = {
  connected: 'Conectado',
  available: 'Disponível',
  soon: 'Em breve',
};

/** Conexões MCP que o assistente pode consultar (mock da fase 1). */
export function Connections() {
  const { connections, setConnectionEnabled } = useAssistant();
  const ask = useAsk();
  const active = connections.filter((c) => c.enabled).length;
  return (
    <>
      <PageHeader
        eyebrow="Assistente · conexões MCP"
        title={`O assistente consulta ${active} ${active === 1 ? 'conexão' : 'conexões'} para responder.`}
        summary="Cada conexão é um servidor MCP. O assistente só lê os dados das conexões ativas e cita de onde veio cada número."
        actions={
          <Button onClick={() => ask({ context: [] })}>
            <IconIA width={16} height={16} />
            Abrir assistente
          </Button>
        }
      />
      <Section title="Conexões" subtitle="Dados de exemplo; nenhuma chamada externa na fase 1">
        <ul className="flex flex-col">
          {connections.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-start gap-x-6 gap-y-3 border-b border-border-subtle py-4"
            >
              <Plug
                aria-hidden="true"
                className="mt-0.5 size-5 flex-none text-secondary-foreground"
                strokeWidth={1.75}
              />
              <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
                <p className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-body font-semibold">{c.name}</span>
                  <span className="text-caption font-normal text-muted-foreground">
                    {STATUS[c.status]}
                  </span>
                </p>
                <p className="text-small text-secondary-foreground">{c.description}</p>
                <p className="text-caption font-normal text-muted-foreground">
                  Consulta: {c.scopes.join(' · ')}
                </p>
              </div>
              <div className="w-full sm:w-56">
                {c.status === 'soon' ? (
                  <p className="text-small text-muted-foreground">Chega na fase 3</p>
                ) : (
                  <Switch
                    label={`Usar ${c.name}`}
                    checked={c.enabled}
                    onChange={(v) => setConnectionEnabled(c.id, v)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
