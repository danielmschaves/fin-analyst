import type { SVGProps } from 'react';

/** Ícones de navegação do Painel 2 (traço 1,75, 24×24), copiados da prancha. */
function Icon({ d, ...props }: SVGProps<SVGSVGElement> & { d: string }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block flex-none"
      {...props}
    >
      <path d={d} />
    </svg>
  );
}

export const IconCarteira = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M12 3v9h9 M21 12a9 9 0 1 1-9-9" {...p} />
);
export const IconAtivos = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M3 3v18h18 M7 14l4-4 3 3 5-6" {...p} />
);
export const IconComparar = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M5 20V10 M11 20V4 M17 20v-7 M3 20h18" {...p} />
);
export const IconProjecoes = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M3 17l6-6 4 4 8-8 M14 7h7v7" {...p} />
);
export const IconImportar = (p: SVGProps<SVGSVGElement>) => (
  <Icon d="M12 16V4 M7 9l5-5 5 5 M4 20h16" {...p} />
);
export const IconIA = (p: SVGProps<SVGSVGElement>) => (
  <Icon
    d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"
    {...p}
  />
);
