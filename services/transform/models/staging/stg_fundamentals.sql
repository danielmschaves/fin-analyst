-- Fatos como reportados, com ano e trimestre do fim do período.
select
  cnpj, company, doc, statement, period_start, period_end, line, value::float8 as value,
  extract(year from period_end)::int as fy,
  extract(quarter from period_end)::int as fq
from {{ source('core', 'fundamentals') }}
