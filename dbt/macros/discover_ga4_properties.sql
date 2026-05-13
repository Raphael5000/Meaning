{#
  Discovers all GA4 property datasets in BigQuery by querying INFORMATION_SCHEMA.
  Returns a list of (source_name, property_id) tuples matching `analytics_*` datasets.

  This eliminates the need to manually register each new client property in
  sources.yml and stg_events.sql — any dataset created by the GA4 BigQuery
  export link is picked up automatically on the next dbt run.
#}

{% macro discover_ga4_properties() %}
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
  {% if results and results.rows %}
    {% for row in results.rows %}
      {% do properties.append((row['schema_name'], row['property_id'])) %}
    {% endfor %}
  {% endif %}

  {{ return(properties) }}
{% endmacro %}
