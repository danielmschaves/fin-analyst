{{ config(post_hook=["create unique index if not exists {{ this.name }}_pk on {{ this }} (ticker, quarter_end)"]) }}
-- DRE resumida por trimestre isolado (R$ bi), no formato de IncomeStatementQuarterly.
--   DRE: ITR já vem em 3 meses (1T–3T); 4T = DFP anual − (1T + 2T + 3T).
--   Depreciação (DFC): acumulado no ano; trimestre = acumulado − acumulado anterior.
-- Um trimestre sem o anterior (ex.: falta o 2T) fica de fora em vez de sair errado.
with f as (
  select * from {{ ref('stg_fundamentals') }}
),
dre_q as (
  select cnpj, fy, fq, line, value from f where statement = 'DRE' and doc = 'ITR'
),
dre_q4 as (
  select a.cnpj, a.fy, 4 as fq, a.line, a.value - coalesce(q.s, 0) as value, q.n
  from f a
  left join (select cnpj, fy, line, sum(value) as s, count(*) as n from dre_q where fq < 4 group by 1, 2, 3) q
    using (cnpj, fy, line)
  where a.statement = 'DRE' and a.doc = 'DFP'
),
dre as (
  select cnpj, fy, fq, line, value from dre_q
  union all
  select cnpj, fy, fq, line, value from dre_q4 where n = 3
),
dfc_ytd as (
  select cnpj, fy, fq, line, value from f where statement = 'DFC'
),
dfc as (
  select cnpj, fy, fq, line,
    value - coalesce(lag(value) over (partition by cnpj, fy, line order by fq), 0) as value,
    fq - coalesce(lag(fq) over (partition by cnpj, fy, line order by fq), 0) as gap
  from dfc_ytd
),
facts as (
  select * from dre
  union all
  select cnpj, fy, fq, line, value from dfc where gap = 1
),
wide as (
  select t.ticker, f.fy, f.fq,
    make_date(f.fy, f.fq * 3, 1) + interval '1 month' - interval '1 day' as quarter_end,
    sum(value) filter (where line = 'revenue') as revenue,
    sum(value) filter (where line = 'cost') as cost,
    sum(value) filter (where line = 'opex') as opex,
    sum(value) filter (where line = 'financial') as financial_result,
    sum(value) filter (where line = 'net_income') as net_income,
    sum(value) filter (where line = 'depreciation') as depreciation
  from facts f
  join {{ ref('ticker_cnpj') }} t on t.cnpj = f.cnpj
  group by 1, 2, 3
)
select
  ticker,
  quarter_end::date as quarter_end,
  fq || 'T' || right(fy::text, 2) as quarter,
  round((revenue / 1e9)::numeric, 3)::float8 as revenue,
  round((cost / 1e9)::numeric, 3)::float8 as cost,
  round((opex / 1e9)::numeric, 3)::float8 as opex,
  round((financial_result / 1e9)::numeric, 3)::float8 as financial_result,
  round((net_income / 1e9)::numeric, 3)::float8 as net_income,
  round((coalesce(depreciation, 0) / 1e9)::numeric, 3)::float8 as depreciation
from wide
where revenue is not null and net_income is not null
