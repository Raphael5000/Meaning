{{
  config(
    materialized = 'incremental',
    unique_key = 'session_key',
    partition_by = {
      'field': 'session_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'merge',
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

-- Sessions built from real GA4 export data
real_sessions AS (

  SELECT
    property_id,
    user_pseudo_id,
    ga_session_id,
    MIN(event_date)                                              AS session_date,
    MIN(event_timestamp)                                         AS session_start,
    MAX(event_timestamp)                                         AS session_end,
    TIMESTAMP_DIFF(MAX(event_timestamp), MIN(event_timestamp), SECOND)
      AS session_duration_seconds,
    COUNTIF(event_name = 'page_view')                            AS pageviews,
    SUM(COALESCE(engagement_time_msec, 0))                       AS total_engagement_time_msec,
    MAX(CASE WHEN engaged_session_event = 1 THEN TRUE ELSE FALSE END)
      AS is_engaged,
    CASE
      WHEN COUNTIF(event_name = 'page_view') <= 1
       AND MAX(COALESCE(engaged_session_event, 0)) = 0
      THEN TRUE ELSE FALSE
    END                                                          AS is_bounce,
    ARRAY_AGG(IF(event_name = 'page_view', page_location, NULL) IGNORE NULLS ORDER BY event_timestamp ASC LIMIT 1)[SAFE_OFFSET(0)]
      AS landing_page,
    ARRAY_AGG(IF(event_name = 'page_view', page_location, NULL) IGNORE NULLS ORDER BY event_timestamp DESC LIMIT 1)[SAFE_OFFSET(0)]
      AS exit_page,
    ARRAY_AGG(session_source IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)]
      AS session_source,
    ARRAY_AGG(session_medium IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)]
      AS session_medium,
    ARRAY_AGG(session_default_channel_group IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)]
      AS session_default_channel_group,
    ARRAY_AGG(device_category IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS device_category,
    ARRAY_AGG(device_os IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS device_os,
    ARRAY_AGG(device_browser IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS device_browser,
    ARRAY_AGG(geo_country IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS geo_country,
    ARRAY_AGG(geo_city IGNORE NULLS LIMIT 1)[SAFE_OFFSET(0)]
      AS geo_city,
    MIN(ga_session_number)                                       AS ga_session_number,
    COUNTIF(event_name = 'first_visit') > 0                      AS is_first_visit

  FROM events
  GROUP BY property_id, user_pseudo_id, ga_session_id

),

real_with_key AS (

  SELECT
    CONCAT(property_id, '-', user_pseudo_id, '-', CAST(ga_session_id AS STRING))
      AS session_key,
    *
  FROM real_sessions

),

-- Session keys that exist in real data (used to exclude overlapping backfill)
real_session_keys AS (
  SELECT DISTINCT session_key FROM real_with_key
),

-- Property+date combos that have real export data (exclude backfill for those)
real_property_dates AS (
  SELECT DISTINCT property_id, session_date FROM real_with_key
),

-- Backfill sessions: only for property+date combos without real data,
-- and never for session_keys that already exist in real data
backfill AS (

  SELECT b.*
  FROM {{ source('backfill', 'backfill_sessions') }} b
  LEFT JOIN real_property_dates r
    ON b.property_id = r.property_id AND b.session_date = r.session_date
  LEFT JOIN real_session_keys k
    ON b.session_key = k.session_key
  WHERE r.property_id IS NULL
    AND k.session_key IS NULL
  QUALIFY ROW_NUMBER() OVER (PARTITION BY b.session_key ORDER BY b.session_start DESC) = 1

)

-- Union: real data takes priority, backfill fills historical gaps
SELECT * FROM real_with_key
UNION ALL
SELECT * FROM backfill
