select ticker, name, specification, isin, asset_class, first_seen, last_seen
from {{ source('core', 'instruments') }}
