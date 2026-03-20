{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'stats_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['campaign_id']
  )
}}

WITH campaigns AS (

  SELECT
    campaign_id,
    campaign_name,
    campaign_type,
    campaign_status,
    campaign_budget_amount_micros
  FROM {{ source('google_ads', 'ads_Campaign') }}

),

stats AS (

  SELECT
    _DATA_DATE                                      AS stats_date,
    campaign_id,
    SUM(metrics_impressions)                        AS impressions,
    SUM(metrics_clicks)                             AS clicks,
    SUM(metrics_cost_micros)                        AS cost_micros,
    SUM(metrics_conversions)                        AS conversions,
    SUM(metrics_conversions_value)                  AS conversions_value
  FROM {{ source('google_ads', 'ads_CampaignBasicStats') }}
  {% if is_incremental() %}
    WHERE _DATA_DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
  {% endif %}
  GROUP BY 1, 2

)

SELECT
  s.stats_date,
  s.campaign_id,
  c.campaign_name,
  c.campaign_type,
  c.campaign_status,

  -- Raw metrics
  s.impressions,
  s.clicks,
  s.cost_micros,
  ROUND(s.cost_micros / 1e6, 2)                    AS cost,
  s.conversions,
  s.conversions_value,

  -- Derived metrics
  SAFE_DIVIDE(s.clicks, s.impressions)              AS ctr,
  SAFE_DIVIDE(s.cost_micros / 1e6, s.clicks)       AS cpc,
  SAFE_DIVIDE(s.cost_micros / 1e6, s.conversions)  AS cpa,
  SAFE_DIVIDE(s.conversions_value, s.cost_micros / 1e6) AS roas,

  -- Budget (from campaign metadata, in currency units)
  ROUND(c.campaign_budget_amount_micros / 1e6, 2)  AS budget

FROM stats s
LEFT JOIN campaigns c USING (campaign_id)
