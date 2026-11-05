import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2.5 rounded-lg bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <span className="text-muted-foreground" aria-hidden="true">
        {icon ?? <Inbox className="size-6" strokeWidth={1.75} />}
      </span>
      <p className="text-body font-semibold">{title}</p>
      {description && (
        <p className="max-w-[280px] text-small text-secondary-foreground">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
