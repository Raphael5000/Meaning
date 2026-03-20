{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'event_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['property_id', 'event_name']
  )
}}

-- Conversion events: any event that is not a standard GA4 auto-collected event.
-- Adjust the exclusion list as needed for this property.

SELECT
  property_id,
  user_pseudo_id,
  ga_session_id,

  event_date,
  event_timestamp,
  event_name,

  -- Page context
  page_location,
  page_title,

  -- Traffic source
  session_source,
  session_medium,
  session_default_channel_group,

  -- Device & geo
  device_category,
  geo_country

FROM {{ ref('stg_events') }}
WHERE event_name NOT IN (
  'page_view',
  'session_start',
  'first_visit',
  'scroll',
  'user_engagement',
  'click',
  'form_start'
)
{% if is_incremental() %}
  AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}
