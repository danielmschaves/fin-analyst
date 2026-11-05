export const DISCLAIMER =
  'A classificação é quantitativa, calculada a partir de dados públicos, e não é recomendação de compra ou venda. Rentabilidade passada não garante resultados futuros. Dados de exemplo fictícios.';

export const SOURCE_NOTE = 'Fonte: relatório mensal B3 · cotações de fechamento (D-1)';

/** Rodapé fixo de todas as telas. */
export function Disclaimer() {
  return (
    <footer className="flex flex-wrap justify-between gap-x-8 gap-y-2 border-t border-border pt-5">
      <p className="max-w-[760px] text-caption font-normal text-muted-foreground">{DISCLAIMER}</p>
      <p className="text-caption font-normal text-muted-foreground">{SOURCE_NOTE}</p>
    </footer>
  );
}
