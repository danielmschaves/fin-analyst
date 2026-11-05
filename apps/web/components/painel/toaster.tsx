'use client';

import { CircleAlert, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

/** Toasts do Painel 2: superfície elevada, ícone colorido, título + uma linha. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="bottom-right"
      closeButton
      icons={{
        success: <Check className="size-[18px] text-positive" strokeWidth={2} />,
        error: <CircleAlert className="size-[18px] text-negative" strokeWidth={2} />,
      }}
      toastOptions={{
        closeButtonAriaLabel: 'Fechar aviso',
        classNames: {
          toast:
            '!rounded-lg !border-0 !bg-surface-raised !text-foreground !shadow-elevation-2 !font-sans !gap-3 !items-start',
          title: '!text-small !font-semibold',
          description: '!text-small !text-secondary-foreground',
          closeButton: '!bg-surface-raised !border-border !text-secondary-foreground',
        },
      }}
    />
  );
}
