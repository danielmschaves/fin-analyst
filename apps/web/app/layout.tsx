import type { Metadata, Viewport } from 'next';
import { Faustina, Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme/theme-provider';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const faustina = Faustina({
  subsets: ['latin'],
  variable: '--font-faustina',
  weight: ['400', '500', '600'],
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
