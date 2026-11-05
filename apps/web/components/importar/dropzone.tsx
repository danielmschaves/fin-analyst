'use client';

import { FileUp } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import { cn } from '@/lib/utils';

/** Área para soltar ou escolher o relatório (.xlsx ou .pdf, até 10 MB). */
export function Dropzone({ onFile, busy }: { onFile: (file: File) => void; busy?: boolean }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg px-6 py-12 text-center transition-colors',
        'shadow-[inset_0_0_0_1px_var(--border)] [background-image:none]',
        over ? 'bg-surface-raised shadow-[inset_0_0_0_2px_var(--accent)]' : 'bg-surface',
      )}
      aria-busy={busy || undefined}
    >
      <FileUp aria-hidden="true" className="size-7 text-secondary-foreground" strokeWidth={1.5} />
      <p className="text-body font-semibold">Arraste o relatório para cá</p>
      <p className="max-w-[420px] text-small text-secondary-foreground">
        Relatório consolidado mensal da B3, em .xlsx ou .pdf, até 10 MB.
      </p>
      <label
        htmlFor={id}
        className="mt-1 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-accent px-4 text-[14px] font-semibold text-accent-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
      >
        Escolher arquivo
        <input
          ref={input}
          id={id}
          type="file"
          accept=".xlsx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
