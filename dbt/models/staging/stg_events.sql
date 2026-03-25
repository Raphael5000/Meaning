{{
  config(
    materialized = 'incremental',
    partition_by = {
      'field': 'event_date',
      'data_type': 'date',
      'granularity': 'day'
    },
    incremental_strategy = 'insert_overwrite',
    cluster_by = ['property_id', 'event_name']
  )
}}

{#
  Macro to flatten one GA4 export dataset into the standard event schema.
  Each source is a separate dataset (analytics_XXXXXX).
#}
{% macro flatten_events(source_name, property_id) %}
  SELECT
    PARSE_DATE('%Y%m%d', event_date)                              AS event_date,
    TIMESTAMP_MICROS(event_timestamp)                              AS event_timestamp,
    event_name,
    stream_id,
    platform,
    '{{ property_id }}'                                            AS property_id,
    user_pseudo_id,
    user_id,
    is_active_user,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id')
      AS ga_session_id,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_number')
      AS ga_session_number,
    (SELECT COALESCE(value.string_value, CAST(value.int_value AS STRING)) FROM UNNEST(event_params) WHERE key = 'session_engaged')
      AS session_engaged,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engaged_session_event')
      AS engaged_session_event,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'entrances')
      AS entrances,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location')
      AS page_location,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title')
      AS page_title,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_referrer')
      AS page_referrer,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec')
      AS engagement_time_msec,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'percent_scrolled')
      AS percent_scrolled,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source')
      AS ep_source,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'medium')
      AS ep_medium,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign')
      AS ep_campaign,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'term')
      AS ep_term,
    traffic_source.source                                          AS user_source,
    traffic_source.medium                                          AS user_medium,
    traffic_source.name                                            AS user_campaign,
    session_traffic_source_last_click.cross_channel_campaign.source  AS session_source,
    session_traffic_source_last_click.cross_channel_campaign.medium  AS session_medium,
    session_traffic_source_last_click.cross_channel_campaign.default_channel_group
      AS session_default_channel_group,
    collected_traffic_source.manual_source                         AS collected_source,
    collected_traffic_source.manual_medium                         AS collected_medium,
    collected_traffic_source.manual_campaign_name                  AS collected_campaign,
    collected_traffic_source.gclid,
    device.category                                                AS device_category,
    device.operating_system                                        AS device_os,
    device.browser                                                 AS device_browser,
    device.language                                                AS device_language,
    COALESCE(device.mobile_brand_name, '')                         AS device_brand,
    geo.continent                                                  AS geo_continent,
    geo.country                                                    AS geo_country,
    geo.region                                                     AS geo_region,
    geo.city                                                       AS geo_city,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'link_url')
      AS link_url,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'link_domain')
      AS link_domain,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'outbound')
      AS outbound,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'form_destination')
      AS form_destination
  FROM {{ source(source_name, 'events') }}
  WHERE _TABLE_SUFFIX NOT LIKE '%intraday%'
  {% if is_incremental() %}
    AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY))
  {% endif %}
{% endmacro %}

{{ flatten_events('ga4_raw_404628120', '404628120') }}
UNION ALL
{{ flatten_events('ga4_raw_379503029', '379503029') }}
UNION ALL
{{ flatten_events('ga4_raw_403387022', '403387022') }}
UNION ALL
{{ flatten_events('ga4_raw_271992166', '271992166') }}
UNION ALL
{{ flatten_events('ga4_raw_484056386', '484056386') }}
