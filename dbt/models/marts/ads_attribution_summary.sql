{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'session_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['campaign_id']
  )
}}

/*
  Daily aggregated attribution: campaign → sessions/conversions → ROAS.
  Joins attributed sessions with campaign cost data for full ROI analysis.
*/

WITH attributed AS (

  SELECT
    session_date,
    campaign_id,
    campaign_name,
    campaign_type,
    ad_group_id,
    ad_group_name,
    keyword_text,
    match_type,
    COUNT(*) AS attributed_sessions,
    COUNT(DISTINCT user_pseudo_id) AS attributed_users,
    COUNTIF(is_engaged) AS engaged_sessions,
    COUNTIF(is_bounce) AS bounced_sessions,
    AVG(session_duration_seconds) AS avg_session_duration,
    SUM(pageviews) AS total_pageviews

  FROM {{ ref('ads_ga4_attribution') }}
  {% if is_incremental() %}
    WHERE session_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
  {% endif %}
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8

),

campaign_cost AS (

  SELECT
    stats_date,
    campaign_id,
    cost,
    impressions,
    clicks,
    conversions,
    conversions_value,
    ctr,
    cpc,
    cpa,
    roas
  FROM {{ ref('ads_campaign_performance') }}

)

SELECT
  a.session_date,
  a.campaign_id,
  a.campaign_name,
  a.campaign_type,
  a.ad_group_id,
  a.ad_group_name,
  a.keyword_text,
  a.match_type,

  -- Attribution metrics (from GA4)
  a.attributed_sessions,
  a.attributed_users,
  a.engaged_sessions,
  a.bounced_sessions,
  a.avg_session_duration,
  a.total_pageviews,

  -- Ads spend metrics (from Google Ads)
  cc.impressions AS ads_impressions,
  cc.clicks AS ads_clicks,
  cc.cost AS ads_cost,
  cc.conversions AS ads_conversions,
  cc.conversions_value AS ads_conversions_value,
  cc.ctr AS ads_ctr,
  cc.cpc AS ads_cpc,
  cc.cpa AS ads_cpa,
  cc.roas AS ads_roas,

  -- Blended metrics
  SAFE_DIVIDE(cc.cost, a.attributed_sessions) AS cost_per_attributed_session,
  SAFE_DIVIDE(a.engaged_sessions, a.attributed_sessions) AS attributed_engagement_rate,
  SAFE_DIVIDE(a.bounced_sessions, a.attributed_sessions) AS attributed_bounce_rate

FROM attributed a
LEFT JOIN campaign_cost cc
  ON a.campaign_id = cc.campaign_id
  AND a.session_date = cc.stats_date
