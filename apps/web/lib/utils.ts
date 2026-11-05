import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Ensina ao tailwind-merge a escala tipográfica do Painel 2 (senão `text-small` vira "cor"). */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'h1', 'lead', 'h2', 'h3', 'body', 'small', 'caption', 'kpi'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
