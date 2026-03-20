{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'session_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['property_id', 'session_source', 'session_medium']
  )
}}

WITH events AS (

  SELECT *
  FROM {{ ref('stg_events') }}
  WHERE user_pseudo_id IS NOT NULL
    AND ga_session_id IS NOT NULL
  {% if is_incremental() %}
    AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
  {% endif %}

),

session_agg AS (

  SELECT
    property_id,
    user_pseudo_id,
    ga_session_id,

    -- Session timing
    MIN(event_date)                                              AS session_date,
    MIN(event_timestamp)                                         AS session_start,
    MAX(event_timestamp)                                         AS session_end,
    TIMESTAMP_DIFF(MAX(event_timestamp), MIN(event_timestamp), SECOND)
      AS session_duration_seconds,

    -- Engagement
    COUNTIF(event_name = 'page_view')                            AS pageviews,
    SUM(COALESCE(engagement_time_msec, 0))                       AS total_engagement_time_msec,
    MAX(CASE WHEN engaged_session_event = 1 THEN TRUE ELSE FALSE END)
      AS is_engaged,

    -- Bounce: session with only 1 pageview and no engagement
    CASE
      WHEN COUNTIF(event_name = 'page_view') <= 1
       AND MAX(COALESCE(engaged_session_event, 0)) = 0
      THEN TRUE
      ELSE FALSE
    END                                                          AS is_bounce,

    -- Landing page (first page_view)
    ARRAY_AGG(
      IF(event_name = 'page_view', page_location, NULL)
      IGNORE NULLS
      ORDER BY event_timestamp ASC
      LIMIT 1
    )[SAFE_OFFSET(0)]                                            AS landing_page,

    -- Exit page (last page_view)
    ARRAY_AGG(
      IF(event_name = 'page_view', page_location, NULL)
      IGNORE NULLS
      ORDER BY event_timestamp DESC
      LIMIT 1
    )[SAFE_OFFSET(0)]                                            AS exit_page,

    -- Traffic source (from first event in session, session-scoped)
    ARRAY_AGG(session_source IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)]
      AS session_source,
    ARRAY_AGG(session_medium IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)]
      AS session_medium,
    ARRAY_AGG(session_default_channel_group IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)]
      AS session_default_channel_group,

    -- Device (consistent within session)
    ARRAY_AGG(device_category IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS device_category,
    ARRAY_AGG(device_os IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS device_os,
    ARRAY_AGG(device_browser IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS device_browser,

    -- Geo (consistent within session)
    ARRAY_AGG(geo_country IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS geo_country,
    ARRAY_AGG(geo_city IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS geo_city,

    -- Session number (first-visit indicator)
    MIN(ga_session_number)                                       AS ga_session_number,
    COUNTIF(event_name = 'first_visit') > 0                      AS is_first_visit

  FROM events
  GROUP BY property_id, user_pseudo_id, ga_session_id

)

SELECT
  -- Primary key
  CONCAT(property_id, '-', user_pseudo_id, '-', CAST(ga_session_id AS STRING))
    AS session_key,

  *

FROM session_agg
