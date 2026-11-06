{{ config(post_hook=[
  "create index if not exists {{ this.name }}_trgm on {{ this }} using gin (search_text gin_trgm_ops)",
  "create unique index if not exists {{ this.name }}_pk on {{ this }} (ticker)"
]) }}
-- Busca (⌘K) e lista de ativos. Só ativos negociados nos últimos 30 dias do último pregão.
-- O contrato da web aceita 'Ação' | 'FII' | 'Renda Fixa': ETF e BDR ficam de fora na PoC.
with last_session as (
  select max(trade_date) as d from {{ ref('stg_prices') }}
),
last_price as (
  select distinct on (ticker) ticker, trade_date, close
  from {{ ref('stg_prices') }}
  where trade_date >= (select d from last_session) - 30
  order by ticker, trade_date desc
)
select
  i.ticker,
  initcap(i.name) as name,
  i.asset_class,
  null::text as sector,
  p.trade_date as last_date,
  p.close as last_price,
  lower(i.ticker || ' ' || i.name) as search_text
from {{ ref('stg_instruments') }} i
join last_price p using (ticker)
where i.asset_class in ('Ação', 'FII')
