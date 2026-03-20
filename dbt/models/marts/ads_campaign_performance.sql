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

SELECT
  stats_date,
  campaign_id,
  campaign_name,
  campaign_type,
  campaign_status,
  impressions,
  clicks,
  cost,
  conversions,
  conversions_value,
  ctr,
  cpc,
  cpa,
  roas,
  budget

FROM {{ ref('stg_ads_campaigns') }}
{% if is_incremental() %}
  WHERE stats_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}
