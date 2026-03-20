{{
  config(
    materialized = 'table',
    cluster_by = ['property_id']
  )
}}

WITH session_data AS (

  SELECT * FROM {{ ref('sessions') }}

),

pageview_data AS (

  SELECT * FROM {{ ref('pageviews') }}

)

SELECT
  s.property_id,
  s.user_pseudo_id,

  -- Lifecycle
  MIN(s.session_start)                                           AS first_seen,
  MAX(s.session_start)                                           AS last_seen,

  -- Volume
  COUNT(*)                                                       AS total_sessions,
  SUM(s.pageviews)                                               AS total_pageviews,

  -- Engagement
  AVG(s.session_duration_seconds)                                AS avg_session_duration_seconds,
  SAFE_DIVIDE(COUNTIF(s.is_bounce), COUNT(*))                    AS bounce_rate,
  SUM(s.total_engagement_time_msec)                              AS total_engagement_time_msec,

  -- Acquisition (first session)
  ARRAY_AGG(s.session_source ORDER BY s.session_start LIMIT 1)[SAFE_OFFSET(0)]
    AS acquisition_source,
  ARRAY_AGG(s.session_medium ORDER BY s.session_start LIMIT 1)[SAFE_OFFSET(0)]
    AS acquisition_medium,
  ARRAY_AGG(s.session_default_channel_group ORDER BY s.session_start LIMIT 1)[SAFE_OFFSET(0)]
    AS acquisition_channel_group,
  ARRAY_AGG(s.landing_page ORDER BY s.session_start LIMIT 1)[SAFE_OFFSET(0)]
    AS acquisition_landing_page,

  -- Device (most common)
  ARRAY_AGG(s.device_category ORDER BY s.session_start DESC LIMIT 1)[SAFE_OFFSET(0)]
    AS device_category,

  -- Geo (most recent)
  ARRAY_AGG(s.geo_country ORDER BY s.session_start DESC LIMIT 1)[SAFE_OFFSET(0)]
    AS geo_country,
  ARRAY_AGG(s.geo_city ORDER BY s.session_start DESC LIMIT 1)[SAFE_OFFSET(0)]
    AS geo_city,

  -- Flags
  MAX(CASE WHEN s.is_first_visit THEN TRUE ELSE FALSE END)      AS is_new_user

FROM session_data s
GROUP BY s.property_id, s.user_pseudo_id
