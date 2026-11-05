import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Section } from '@/components/painel/section';

export function Teaser({
  id,
  title,
  lead,
  href,
  cta,
}: {
  id: string;
  title: string;
  lead: string;
  href: string;
  cta: string;
}) {
  return (
    <Section id={id} title={title} lead={lead}>
      <Link
        href={href}
        className="inline-flex min-h-8 items-center gap-1 rounded-sm text-small font-semibold text-foreground no-underline hover:underline"
      >
        {cta}
        <ChevronRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </Link>
    </Section>
  );
}
