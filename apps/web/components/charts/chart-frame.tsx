'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Moldura de gráfico acessível: `role="img"` com um rótulo que resume os números.
 * O SVG do Recharts só é montado no cliente (precisa medir a largura); antes disso, reserva a altura.
 */
export function ChartFrame({
  label,
  height,
  children,
  className,
}: {
  label: string;
  height: number;
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div
      role="img"
      aria-label={label}
      className={className}
      style={{ height, width: '100%', minWidth: 0 }}
    >
      {mounted ? children : null}
    </div>
  );
}

export const axisTick = {
  fill: 'var(--muted-foreground)',
  fontSize: 12,
  fontFamily: 'var(--font-sans)',
} as const;
