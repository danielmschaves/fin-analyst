import type { ComponentType, SVGProps } from 'react';
import { IconAtivos, IconCarteira, IconComparar, IconImportar, IconProjecoes } from './icons';

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Prefixos de rota que marcam este item como ativo. */
  match: string[];
  disabled?: boolean;
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/carteira', label: 'Carteira', icon: IconCarteira, match: ['/carteira'], mobile: true },
  {
    href: '/ativos',
    label: 'Ativos',
    icon: IconAtivos,
    match: ['/ativos', '/ativo/'],
    mobile: true,
  },
  {
    href: '/comparar',
    label: 'Comparar',
    icon: IconComparar,
    match: ['/comparar'],
    disabled: true,
  },
  {
    href: '/projecoes',
    label: 'Projeções',
    icon: IconProjecoes,
    match: ['/projecoes'],
    mobile: true,
  },
  { href: '/importar', label: 'Importar', icon: IconImportar, match: ['/importar'], mobile: true },
];

export function isActive(item: NavItem, pathname: string) {
  return item.match.some((m) =>
    m.endsWith('/') ? pathname.startsWith(m) : pathname === m || pathname.startsWith(`${m}/`),
  );
}

/** Título curto da tela no cabeçalho mobile. */
export function mobileTitle(pathname: string) {
  const asset = /^\/ativo\/([^/]+)/.exec(pathname);
  if (asset) return decodeURIComponent(asset[1]!).toUpperCase();
  const item = NAV_ITEMS.find((i) => isActive(i, pathname));
  if (item) return item.label;
  if (pathname.startsWith('/conexoes')) return 'Conexões';
  return 'fin-analyst';
}
