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
        schema_name,
        REGEXP_EXTRACT(schema_name, r'^analytics_(\d+)$') AS property_id
      FROM `scenic-healer-486415-u3`.`region-eu`.INFORMATION_SCHEMA.SCHEMATA
      WHERE REGEXP_CONTAINS(schema_name, r'^analytics_\d+$')
      ORDER BY schema_name
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
