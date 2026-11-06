-- Falha se o último pregão tiver menos ativos que o esperado (arquivo truncado, filtro errado…).
select count(*) as tickers
from {{ ref('mart_asset_index') }}
where last_date = (select max(last_date) from {{ ref('mart_asset_index') }})
having count(*) < {{ var('min_tickers_last_session') }}
