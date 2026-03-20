{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'click_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['campaign_id', 'ad_group_id']
  )
}}

SELECT
  _DATA_DATE                                        AS click_date,
  click_view_gclid                                  AS gclid,
  campaign_id,
  ad_group_id,
  click_view_area_of_interest_city                  AS click_city,
  click_view_area_of_interest_country               AS click_country,
  click_view_page_number                            AS page_number,
  click_view_ad_network_type                        AS ad_network_type

FROM {{ source('google_ads', 'ads_ClickStats') }}
WHERE click_view_gclid IS NOT NULL
{% if is_incremental() %}
  AND _DATA_DATE >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
{% endif %}
