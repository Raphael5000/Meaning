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
  Join GA4 sessions with Google Ads click data via gclid.
  Each GA4 session from a Google Ads click gets enriched with
  campaign name, ad group, keyword, and cost data.
*/

WITH sessions_with_gclid AS (

  SELECT
    session_key,
    property_id,
    user_pseudo_id,
    ga_session_id,
    session_date,
    session_start,
    pageviews,
    is_bounce,
    is_engaged,
    session_duration_seconds,
    landing_page,
    device_category,
    geo_country,
    geo_city
  FROM {{ ref('sessions') }}
  {% if is_incremental() %}
    WHERE session_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
  {% endif %}

),

-- Get gclid from the first event of each session
session_gclids AS (

  SELECT
    ga_session_id,
    user_pseudo_id,
    ARRAY_AGG(gclid IGNORE NULLS ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)] AS gclid
  FROM {{ ref('stg_events') }}
  WHERE gclid IS NOT NULL
  {% if is_incremental() %}
    AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY)
  {% endif %}
  GROUP BY ga_session_id, user_pseudo_id

),

clicks AS (

  SELECT
    gclid,
    campaign_id,
    ad_group_id,
    click_date
  FROM {{ ref('stg_ads_clicks') }}

),

campaigns AS (

  SELECT DISTINCT
    campaign_id,
    campaign_name,
    campaign_type
  FROM {{ ref('stg_ads_campaigns') }}

),

ad_groups AS (

  SELECT
    ad_group_id,
    ad_group_name
  FROM {{ source('google_ads', 'ads_AdGroup') }}

),

keywords AS (

  SELECT
    ad_group_id,
    ad_group_criterion_keyword_text AS keyword_text,
    ad_group_criterion_keyword_match_type AS match_type
  FROM {{ source('google_ads', 'ads_Keyword') }}

)

SELECT
  s.session_key,
  s.property_id,
  s.user_pseudo_id,
  s.ga_session_id,
  s.session_date,
  s.session_start,
  s.pageviews,
  s.is_bounce,
  s.is_engaged,
  s.session_duration_seconds,
  s.landing_page,
  s.device_category,
  s.geo_country,
  s.geo_city,

  -- Ads attribution
  sg.gclid,
  cl.campaign_id,
  c.campaign_name,
  c.campaign_type,
  cl.ad_group_id,
  ag.ad_group_name,
  k.keyword_text,
  k.match_type

FROM sessions_with_gclid s
INNER JOIN session_gclids sg
  ON s.ga_session_id = sg.ga_session_id
  AND s.user_pseudo_id = sg.user_pseudo_id
INNER JOIN clicks cl ON sg.gclid = cl.gclid
LEFT JOIN campaigns c ON cl.campaign_id = c.campaign_id
LEFT JOIN ad_groups ag ON cl.ad_group_id = ag.ad_group_id
LEFT JOIN keywords k ON cl.ad_group_id = k.ad_group_id
