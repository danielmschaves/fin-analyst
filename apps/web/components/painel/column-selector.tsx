'use client';

import type { VisibilityState } from '@tanstack/react-table';
import { Check, SlidersHorizontal } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { Button } from '@/components/ui/button';

export type SelectableColumn = { id: string; label: string };

/** "Colunas": escolhe quais colunas da tabela ficam visíveis. */
export function ColumnSelector({
  columns,
  visibility,
  onChange,
  tableLabel,
}: {
  columns: SelectableColumn[];
  visibility: VisibilityState;
  onChange: (v: VisibilityState) => void;
  tableLabel: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Colunas de ${tableLabel}`}>
          <SlidersHorizontal aria-hidden="true" strokeWidth={1.75} />
          Colunas
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-52 rounded-lg bg-popover p-1.5 text-popover-foreground shadow-elevation-2"
        >
          <DropdownMenu.Label className="px-2.5 pt-1.5 pb-2 text-caption text-secondary-foreground">
            Mostrar colunas
          </DropdownMenu.Label>
          {columns.map((c) => {
            const checked = visibility[c.id] !== false;
            return (
              <DropdownMenu.CheckboxItem
                key={c.id}
                checked={checked}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(v) => onChange({ ...visibility, [c.id]: v === true })}
                className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-small outline-none select-none data-[highlighted]:bg-border"
              >
                <span
                  aria-hidden="true"
                  className="grid size-4 place-items-center rounded-sm shadow-[inset_0_0_0_1px_var(--muted-foreground)]"
                >
                  <DropdownMenu.ItemIndicator>
                    <Check className="size-3" strokeWidth={2.5} />
                  </DropdownMenu.ItemIndicator>
                </span>
                {c.label}
              </DropdownMenu.CheckboxItem>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
