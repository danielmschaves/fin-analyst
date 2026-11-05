import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-sm bg-surface-raised', className)}
    />
  );
}

/** Bloco de carregamento padrão: rótulo, número e três linhas. */
export function SkeletonBlock({ label = 'Carregando' }: { label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} role="status" className="flex flex-col gap-3">
      <Skeleton className="h-3 w-[30%]" />
      <Skeleton className="h-9 w-[60%] rounded-md" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-3 flex-[2]" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}
