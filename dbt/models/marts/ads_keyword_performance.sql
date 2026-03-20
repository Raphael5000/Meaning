{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'stats_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['campaign_id', 'ad_group_id']
  )
}}

WITH ad_group_stats AS (

  SELECT
    _DATA_DATE                                      AS stats_date,
    campaign_id,
    ad_group_id,
    SUM(metrics_impressions)                        AS impressions,
    SUM(metrics_clicks)                             AS clicks,
    SUM(metrics_cost_micros)                        AS cost_micros,
    SUM(metrics_conversions)                        AS conversions,
    SUM(metrics_conversions_value)                  AS conversions_value
  FROM {{ source('google_ads', 'ads_AdGroupBasicStats') }}
  {% if is_incremental() %}
    WHERE _DATA_DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
  {% endif %}
  GROUP BY 1, 2, 3

),

keywords AS (

  SELECT
    ad_group_id,
    ad_group_criterion_keyword_text                 AS keyword_text,
    ad_group_criterion_keyword_match_type           AS match_type,
    ad_group_criterion_status                       AS keyword_status
  FROM {{ source('google_ads', 'ads_Keyword') }}

),

campaigns AS (

  SELECT
    campaign_id,
    campaign_name
  FROM {{ source('google_ads', 'ads_Campaign') }}

),

ad_groups AS (

  SELECT
    ad_group_id,
    ad_group_name,
    campaign_id
  FROM {{ source('google_ads', 'ads_AdGroup') }}

)

SELECT
  s.stats_date,
  c.campaign_id,
  c.campaign_name,
  ag.ad_group_id,
  ag.ad_group_name,
  k.keyword_text,
  k.match_type,
  k.keyword_status,

  s.impressions,
  s.clicks,
  ROUND(s.cost_micros / 1e6, 2)                    AS cost,
  s.conversions,
  s.conversions_value,

  SAFE_DIVIDE(s.clicks, s.impressions)              AS ctr,
  SAFE_DIVIDE(s.cost_micros / 1e6, s.clicks)       AS cpc,
  SAFE_DIVIDE(s.cost_micros / 1e6, s.conversions)  AS cpa,
  SAFE_DIVIDE(s.conversions_value, s.cost_micros / 1e6) AS roas

FROM ad_group_stats s
LEFT JOIN ad_groups ag USING (ad_group_id)
LEFT JOIN campaigns c ON ag.campaign_id = c.campaign_id
LEFT JOIN keywords k USING (ad_group_id)
