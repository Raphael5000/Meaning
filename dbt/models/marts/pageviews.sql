{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'event_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['property_id']
  )
}}

SELECT
  -- Keys
  property_id,
  user_pseudo_id,
  ga_session_id,

  -- Timing
  event_date,
  event_timestamp,

  -- Page
  page_location,
  page_title,
  page_referrer,

  -- Engagement
  engagement_time_msec,

  -- Traffic source (session-scoped)
  session_source,
  session_medium,
  session_default_channel_group,

  -- Device & geo
  device_category,
  device_os,
  device_browser,
  geo_country,
  geo_city

FROM {{ ref('stg_events') }}
WHERE event_name = 'page_view'
{% if is_incremental() %}
  AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}
