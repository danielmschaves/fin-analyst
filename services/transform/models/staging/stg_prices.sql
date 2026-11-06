select ticker, trade_date, close::float8 as close, volume::float8 as volume
from {{ source('core', 'prices_daily') }}
where close > 0
