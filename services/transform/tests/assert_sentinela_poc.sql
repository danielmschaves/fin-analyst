-- Drill P1 da PoC: com --vars '{poc_sentinel: true}' este teste falha e o publish não pode trocar nada.
select 1 as sentinela where {{ 'true' if var('poc_sentinel') else 'false' }}
