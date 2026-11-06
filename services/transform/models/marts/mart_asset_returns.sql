{{ config(post_hook=["create unique index if not exists {{ this.name }}_pk on {{ this }} (ticker)"]) }}
-- Cotação e retornos por janela (em pontos percentuais), a partir do último fechamento de cada ativo.
-- Cada janela compara com o último pregão em ou antes da data-alvo; sem histórico, null.
with idx as (
  select ticker, last_date, last_price from {{ ref('mart_asset_index') }}
),
prev as (
  select i.ticker,
    (select close from {{ ref('stg_prices') }} s where s.ticker = i.ticker and s.trade_date < i.last_date order by trade_date desc limit 1) as prev_close
  from idx i
),
w as (
  select i.ticker, k.win, k.target
  from idx i
  cross join lateral (values
    ('5D',  i.last_date - 7),
    ('1M',  (i.last_date - interval '1 month')::date),
    ('6M',  (i.last_date - interval '6 months')::date),
    ('YTD', (date_trunc('year', i.last_date) - interval '1 day')::date),
    ('1A',  (i.last_date - interval '1 year')::date),
    ('2A',  (i.last_date - interval '2 years')::date),
    ('5A',  (i.last_date - interval '5 years')::date)
  ) as k(win, target)
),
base as (
  select w.ticker, w.win,
    (select close from {{ ref('stg_prices') }} s
      where s.ticker = w.ticker and s.trade_date <= w.target and s.trade_date > w.target - 10
      order by trade_date desc limit 1) as base_close
  from w
),
pivot as (
  select ticker,
    max(base_close) filter (where win = '5D') as b5d,
    max(base_close) filter (where win = '1M') as b1m,
    max(base_close) filter (where win = '6M') as b6m,
    max(base_close) filter (where win = 'YTD') as bytd,
    max(base_close) filter (where win = '1A') as b1a,
    max(base_close) filter (where win = '2A') as b2a,
    max(base_close) filter (where win = '5A') as b5a
  from base group by ticker
)
select
  i.ticker,
  i.last_date as date,
  i.last_price as price,
  round(((i.last_price / nullif(p.prev_close, 0) - 1) * 100)::numeric, 2)::float8 as day_change_pct,
  {% for col, b in [('r_5d','b5d'),('r_1m','b1m'),('r_6m','b6m'),('r_ytd','bytd'),('r_1a','b1a'),('r_2a','b2a'),('r_5a','b5a')] %}
  round(((i.last_price / nullif(v.{{ b }}, 0) - 1) * 100)::numeric, 2)::float8 as {{ col }}{{ "," if not loop.last }}
  {% endfor %}
from idx i
left join prev p using (ticker)
left join pivot v using (ticker)
