{#
  Discovers all GA4 property datasets in BigQuery by querying INFORMATION_SCHEMA.
  Only returns EU-region datasets (the region-eu INFORMATION_SCHEMA only lists those).

  This eliminates the need to manually register each new client property —
  any analytics_* dataset is picked up automatically on the next dbt run.
#}

{% macro discover_ga4_properties() %}

  {# run_query returns empty during dbt parse/compile without a connection #}
  {% if execute %}
    {% set query %}
      SELECT
        s.schema_name,
        REGEXP_EXTRACT(s.schema_name, r'^analytics_(\d+)$') AS property_id
      FROM `scenic-healer-486415-u3`.`region-eu`.INFORMATION_SCHEMA.SCHEMATA s
      WHERE REGEXP_CONTAINS(s.schema_name, r'^analytics_\d+$')
        AND EXISTS (
          SELECT 1
          FROM `scenic-healer-486415-u3`.`region-eu`.INFORMATION_SCHEMA.TABLES t
          WHERE t.table_schema = s.schema_name
            AND t.table_name LIKE 'events_%'
        )
      ORDER BY s.schema_name
    {% endset %}

    {% set results = run_query(query) %}

    {% set properties = [] %}
    {% for row in results.rows %}
      {% do properties.append((row['schema_name'], row['property_id'])) %}
    {% endfor %}

    {{ return(properties) }}
  {% else %}
    {{ return([]) }}
  {% endif %}

{% endmacro %}
