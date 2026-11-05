import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme/theme-provider';
import './globals.css';

// Fontes self-hosted (subconjunto latin, os mesmos woff2 servidos pelo Google Fonts):
// o build não depende de rede. Licença SIL OFL em app/fonts.
const geist = localFont({
  src: './fonts/geist-latin.woff2',
  variable: '--font-geist',
  weight: '100 900',
  display: 'swap',
});
const faustina = localFont({
  src: './fonts/faustina-latin.woff2',
  variable: '--font-faustina',
  weight: '300 800',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'fin-analyst', template: '%s · fin-analyst' },
  description: 'Análise de carteira e ativos da B3. Descreve, não recomenda.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f0e0d' },
    { media: '(prefers-color-scheme: light)', color: '#f7f6f3' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geist.variable} ${faustina.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
