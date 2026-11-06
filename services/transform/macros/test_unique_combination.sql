{# Unicidade de uma combinação de colunas (sem o pacote dbt_utils: o build não baixa dependências). #}
{% test unique_combination(model, columns) %}
select {{ columns | join(', ') }}, count(*) as n
from {{ model }}
group by {{ columns | join(', ') }}
having count(*) > 1
{% endtest %}
