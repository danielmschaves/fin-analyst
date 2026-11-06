# Fontes de dados da ingestão

Configuração em `services/ingest/fin_ingest/sources.yaml`. Credenciais só por variável de ambiente.
Toda fonte passa pelo mesmo cliente HTTP (`fin_ingest/http.py`), que aplica:

- timeouts;
- retry em erro de rede, 429 e 5xx, com backoff exponencial e jitter completo;
- respeito ao `Retry-After`;
- token bucket e circuit breaker;
- requisição condicional (ETag/Last-Modified);
- orçamento diário de chamadas.

Itens marcados **(verificar)** não puderam ser confirmados no ambiente de desenvolvimento, que não
tem acesso de rede a essas fontes. Eles são conferidos na primeira execução real (workflow
`poc-pipeline`) e registrados no relatório da PoC.

| Fonte | O que traz | Unidade de trabalho | Frequência | Ritmo e orçamento | Crítica |
| --- | --- | --- | --- | --- | --- |
| **B3 · COTAHIST** | Cotações de todo o mercado à vista: OHLC, volume, ISIN, especificação | `A2025` (ano, backfill) · `D30102026` (dia) | Diária, D-1 depois das ~20h | 0,5 req/s, 1 por vez, 50/dia | sim |
| **CVM · DFP/ITR** | DRE e DFC consolidados de todas as companhias abertas | `ITR2026` · `DFP2025` | Semanal (requisição condicional: 304 quando nada mudou) | 0,5 req/s, 100/dia | não |
| **BCB · SGS** | Séries macro: 4391 (CDI mensal) | código da série | Diária, incremental pelo watermark | padrão (1 req/s) | não |
| **brapi** | Proventos (`cashDividends`) por ticker | ticker | Semanal | orçamento diário conforme o plano **(verificar)**; sem `BRAPI_TOKEN`, a fonte fica `skipped` | não |

## B3 · COTAHIST

- **URL:** `https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_{A2025|D30102026}.ZIP`.
- **Layout:** largura fixa de 245 posições ("SerHist", registro 01).
  - Preços em centavos, divididos pelo `FATCOT`.
  - Filtro: `TPMERC=010` (à vista) e `CODBDI` 02 (lote padrão), 12 (FII) e 14 (certificados/ETF).
- **Volume:** o arquivo anual compactado tem dezenas de MB. O bronze guarda o ZIP como chegou; o silver guarda Parquet por ano e mês.
- **Termos:** dados públicos da B3, para uso informativo e com a fonte citada. As cotações são de fechamento (D-1), sem tempo real. Termos de uso do site da B3 **(verificar)**.
- **Limites:** não publicados. Usamos ritmo conservador e não fazemos download paralelo.

## CVM · Dados Abertos (DFP e ITR)

- **URL:** `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/{ITR|DFP}/DADOS/{itr|dfp}_cia_aberta_{ano}.zip`.
- **Formato:** CSV `;`, latin-1.
  - Linhas usadas: `ESCALA_MOEDA` (MIL → ×1000), `ORDEM_EXERC = ÚLTIMO`, a maior `VERSAO` por CNPJ e data de referência.
  - ITR: DRE do trimestre isolado (3 meses) e DFC acumulado no ano. O 4º trimestre (DFP − 9M) e a depreciação por trimestre saem no dbt.
- **Volume:** o silver guarda todas as companhias; o core da PoC, só os CNPJs de `sources.yaml`.
- **Licença:** Open Data Commons Open Database License (ODbL) **(verificar)**, com a fonte citada.
- **Limites:** não publicados. Os arquivos mudam raramente, então a requisição condicional evita downloads repetidos.

## Banco Central · SGS

- **URL:** `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{código}/dados?formato=json&dataInicial=dd/MM/aaaa&dataFinal=dd/MM/aaaa`.
- **Comportamento:** 404 quando não há dado no intervalo, e tratamos como "nada novo". O BCB limita consultas de séries diárias a 10 anos por chamada **(verificar)**; a 4391 é mensal.
- **Licença:** dados abertos do BCB, de uso livre com a fonte citada.

## brapi

- **URL:** `https://brapi.dev/api/quote/{ticker}?dividends=true&token=…`.
- **Termos:** o plano gratuito tem limite mensal e alguns tickers exigem plano pago **(verificar)**. Por isso cada chamada passa pelo orçamento diário (`ingest.api_calls`) e o conector para com `degraded` quando ele acaba.
