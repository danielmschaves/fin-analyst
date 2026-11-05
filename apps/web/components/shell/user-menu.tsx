'use client';

import { Check, Moon, Plug, Sun, User } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { DropdownMenu } from 'radix-ui';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')
  ).toUpperCase();
}

const itemClass =
  'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-small text-foreground no-underline outline-none select-none data-[highlighted]:bg-border';

export function UserMenu({ name, email }: { name: string; email: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Menu do usuário: conta, tema e conexões"
        className="inline-grid size-11 flex-none cursor-pointer place-items-center rounded-full md:size-10"
      >
        <span
          aria-hidden="true"
          className="inline-grid size-8 place-items-center rounded-full bg-surface-raised text-caption font-semibold text-foreground"
        >
          {initials(name)}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-lg bg-popover p-1.5 text-popover-foreground shadow-elevation-2"
        >
          <div className="px-2.5 pt-1.5 pb-2">
            <p className="text-small font-semibold">{name}</p>
            <p className="text-caption font-normal text-muted-foreground">{email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Label className="px-2.5 pt-1.5 pb-1 text-caption text-secondary-foreground">
            Tema
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={resolvedTheme ?? 'dark'} onValueChange={setTheme}>
            {[
              { value: 'dark', label: 'Escuro', Icon: Moon },
              { value: 'light', label: 'Claro', Icon: Sun },
            ].map(({ value, label, Icon }) => (
              <DropdownMenu.RadioItem key={value} value={value} className={itemClass}>
                <Icon
                  aria-hidden="true"
                  className="size-4 text-secondary-foreground"
                  strokeWidth={1.75}
                />
                {label}
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <Check className="size-4" strokeWidth={2} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={itemClass} disabled>
            <User
              aria-hidden="true"
              className="size-4 text-secondary-foreground"
              strokeWidth={1.75}
            />
            Conta
            <span className="ml-auto text-caption font-normal text-muted-foreground">em breve</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/conexoes">
              <Plug
                aria-hidden="true"
                className="size-4 text-secondary-foreground"
                strokeWidth={1.75}
              />
              Conexões
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
