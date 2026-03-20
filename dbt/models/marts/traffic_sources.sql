{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'session_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['property_id']
  )
}}

SELECT
  session_date,
  property_id,

  COALESCE(session_source, '(direct)')                           AS source,
  COALESCE(session_medium, '(none)')                             AS medium,
  COALESCE(session_default_channel_group, 'Unassigned')          AS channel_group,

  -- Volume
  COUNT(*)                                                       AS sessions,
  COUNT(DISTINCT user_pseudo_id)                                 AS users,
  COUNTIF(is_first_visit)                                        AS new_users,
  SUM(pageviews)                                                 AS pageviews,

  -- Engagement
  SAFE_DIVIDE(COUNTIF(is_bounce), COUNT(*))                      AS bounce_rate,
  AVG(session_duration_seconds)                                  AS avg_session_duration_seconds,
  AVG(total_engagement_time_msec)                                AS avg_engagement_time_msec

FROM {{ ref('sessions') }}
{% if is_incremental() %}
WHERE session_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}
GROUP BY session_date, property_id, source, medium, channel_group
