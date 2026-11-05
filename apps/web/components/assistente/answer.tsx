import { Highlight } from '@/components/painel/page-header';

/** Texto com números entre chaves ("{+11,4%}") destacados pelo sinal. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/\{([^}]+)\}/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <Highlight
            key={i}
            tone={p.startsWith('−') || p.startsWith('-') ? 'negative' : 'positive'}
          >
            {p}
          </Highlight>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function plainText(text: string) {
  return text.replace(/\{([^}]+)\}/g, '$1');
}
