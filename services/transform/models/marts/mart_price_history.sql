{{ config(post_hook=["create unique index if not exists {{ this.name }}_pk on {{ this }} (ticker, date)"]) }}
-- Fechamento diário no último ano e semanal (último pregão de cada semana) antes, até N anos.
-- Preço não ajustado por proventos na PoC (o ajuste entra com core.dividends).
with bounds as (
  select max(trade_date) as last_d from {{ ref('stg_prices') }}
),
p as (
  select s.ticker, s.trade_date, s.close, b.last_d
  from {{ ref('stg_prices') }} s cross join bounds b
  where s.trade_date > b.last_d - interval '{{ var("history_years") }} years'
),
weekly as (
  select distinct on (ticker, date_trunc('week', trade_date)) ticker, trade_date, close
  from p
  where trade_date <= last_d - {{ var('daily_window_days') }}
  order by ticker, date_trunc('week', trade_date), trade_date desc
)
select ticker, trade_date as date, close from p where trade_date > last_d - {{ var('daily_window_days') }}
union all
select ticker, trade_date as date, close from weekly
