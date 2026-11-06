select * from {{ ref('mart_price_history') }} where close <= 0
