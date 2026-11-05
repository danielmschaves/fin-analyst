# Layout — Relatório consolidado mensal da B3

Origem: Área do Investidor B3 → Relatórios → Consolidado mensal.
Nome do arquivo: `relatorio-consolidado-mensal-AAAA-<mes>.xlsx` (ex.: `relatorio-consolidado-mensal-2026-outubro.xlsx`).
Data de referência das posições = último dia do mês indicado no nome do arquivo.
Validado com o relatório de outubro/2026. Fixture sintética: `tests/fixtures/relatorio-consolidado-sintetico.xlsx`.

## Estrutura comum a todas as abas

- Cabeçalho na linha 1; dados a partir da linha 2.
- Após os dados: 2 linhas em branco (células `""`) e 1 linha de total com valor só na última coluna de valor. Ignorar qualquer linha sem `Produto` (ou sem `Código de Negociação` na aba Negociações).
- `"-"`, `""` e vazio → `null`.
- Datas como texto `dd/mm/aaaa`.
- Números já vêm numéricos (int/float), exceto `Quantidade` em Proventos Recebidos (texto).
- `Produto` segue `TICKER - NOME DA EMPRESA`.
- `Conta` é dado pessoal → descartar no parse, nunca persistir.
- Abas podem estar ausentes ou vazias (ex.: investidor sem renda fixa) → tratar como zero linhas.

## Abas

### Posição - Ações → `positions` (classe `acao`) + `assets`
| Coluna | Tipo | Uso |
|---|---|---|
| Produto | texto | nome (após " - ") |
| Instituição | texto | `positions.institution` |
| Conta | texto | **descartar** |
| Código de Negociação | texto | `ticker` (chave) |
| CNPJ da Empresa | texto | `assets.cnpj` (liga à CVM) |
| Código ISIN / Distribuição | texto | `assets.isin` |
| Tipo | ON / PN / UNIT | `assets.share_type` |
| Escriturador | texto | ignorar |
| Quantidade | int | `positions.quantity` |
| Quantidade Disponível | int | `positions.quantity_available` |
| Quantidade Indisponível | int ou "-" | `positions.quantity_blocked` |
| Motivo | texto ou "-" | `positions.blocked_reason` |
| Preço de Fechamento | float | `positions.close_price` |
| Valor Atualizado | float | `positions.market_value` |

### Posição - Fundos → `positions` (classe `fii`/`fundo`)
Mesmas 14 colunas da aba Ações, com `CNPJ do Fundo` no lugar de `CNPJ da Empresa`, `Tipo` = `Cotas` e `Administrador` no lugar de `Escriturador`. Classe `fii` quando o ticker termina em `11` e o CNPJ é de fundo.

### Posição - Renda Fixa → `positions_fixed_income`
Colunas: Produto, Instituição, Emissor, Código (chave), Indexador (ex.: DI), Tipo de regime (ex.: REGISTRADO), Data de Emissão, Vencimento, Quantidade, Quantidade Disponível, Quantidade Indisponível, Motivo, Contraparte, Preço Atualizado MTM, Valor Atualizado MTM, Preço Atualizado CURVA, Valor Atualizado CURVA. Há 2 colunas extras sem cabeçalho no fim (ignorar).
Regra: `market_value` = Valor MTM quando numérico; senão Valor CURVA. Guardar ambos.

### Proventos Recebidos → `dividends_received`
Colunas: Produto, Pagamento (data), Tipo de Evento (`Rendimento`, `Juros Sobre Capital Próprio`, outros possíveis: `Dividendo`), Instituição, Quantidade (texto → int), Preço unitário, Valor líquido.
Ticker extraído de Produto. Chave de idempotência: (user_id, ticker, pagamento, tipo_evento, instituição).

### Negociações → `trades_monthly`
Colunas: Código de Negociação, Período (Inicial), Período (Final) (geralmente "-"), Instituição, Quantidade (Compra), Quantidade (Venda), Quantidade (Líquida), Preço Médio (Compra), Preço Médio (Venda).
Agregado por ticker no período — não é extrato operação a operação. Sem linha de total.

## Implicações para o produto

- O relatório **não traz preço médio nem custo**: PM é reconstruído somando as Negociações de todos os meses importados (custo médio ponderado; vendas não alteram o PM). Para PM exato desde o início, importar todos os relatórios mensais históricos ou o export de Movimentação.
- Rentabilidade da carteira no MVP é mensal (time-weighted por mês) a partir dos snapshots mensais + proventos.
- Reimportar o mesmo arquivo (mesmo SHA-256) não duplica; importar um mês já existente substitui o snapshot daquele mês.
