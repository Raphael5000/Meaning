import Anthropic from "@anthropic-ai/sdk";

/** Tool definitions exposed to Claude for GA4 querying (legacy). */
export const GA4_TOOLS: Anthropic.Tool[] = [
  {
    name: "run_report",
    description:
      "Run a Google Analytics 4 report. Use this to query historical analytics data such as page views, sessions, users, bounce rate, traffic sources, geography, device breakdown, and more. You can specify date ranges, dimensions to group by, metrics to measure, sorting, and row limits.",
    input_schema: {
      type: "object" as const,
      properties: {
        metrics: {
          type: "array",
          items: { type: "string" },
          description:
            'GA4 metric API names to retrieve, e.g. ["activeUsers", "sessions", "screenPageViews", "bounceRate", "averageSessionDuration", "totalRevenue", "conversions", "engagementRate", "eventCount"].',
        },
        dimensions: {
          type: "array",
          items: { type: "string" },
          description:
            'GA4 dimension API names to group by, e.g. ["date", "country", "city", "source", "medium", "pagePath", "deviceCategory", "sessionDefaultChannelGroup", "eventName"].',
        },
        startDate: {
          type: "string",
          description:
            'Start date in YYYY-MM-DD format or relative like "7daysAgo", "30daysAgo", "90daysAgo". Defaults to "28daysAgo".',
        },
        endDate: {
          type: "string",
          description:
            'End date in YYYY-MM-DD format or "today", "yesterday". Defaults to "today".',
        },
        limit: {
          type: "number",
          description: "Maximum number of rows to return (default 10, max 100).",
        },
        orderBys: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", description: "Metric or dimension name to sort by." },
              direction: {
                type: "string",
                enum: ["ASCENDING", "DESCENDING"],
                description: "Sort direction. Defaults to DESCENDING.",
              },
              type: {
                type: "string",
                enum: ["metric", "dimension"],
                description: 'Whether the field is a "metric" or "dimension". Defaults to "metric".',
              },
            },
            required: ["field"],
          },
          description: "How to order the results.",
        },
      },
      required: ["metrics"],
    },
  },
  {
    name: "run_realtime_report",
    description:
      "Run a Google Analytics 4 real-time report. Shows data from the last 30 minutes. Useful for seeing who is on the site right now, what pages they're viewing, where traffic is coming from in real time.",
    input_schema: {
      type: "object" as const,
      properties: {
        metrics: {
          type: "array",
          items: { type: "string" },
          description:
            'Real-time metric API names, e.g. ["activeUsers", "screenPageViews", "eventCount", "conversions"].',
        },
        dimensions: {
          type: "array",
          items: { type: "string" },
          description:
            'Real-time dimension API names, e.g. ["unifiedScreenName", "country", "city", "deviceCategory"].',
        },
        limit: {
          type: "number",
          description: "Maximum number of rows to return (default 10).",
        },
      },
      required: ["metrics"],
    },
  },
  {
    name: "get_metadata",
    description:
      "Get the available metrics and dimensions for the connected GA4 property. Use this when you need to discover what data is available or verify a metric/dimension name before running a report.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["metrics", "dimensions", "all"],
          description:
            'What to retrieve: "metrics", "dimensions", or "all". Defaults to "all".',
        },
      },
      required: [],
    },
  },
];

/** Tool definitions for BigQuery-backed analytics querying. */
export const BIGQUERY_TOOLS: Anthropic.Tool[] = [
  {
    name: "query_analytics",
    description:
      "Query analytics data from BigQuery. Use this to answer questions about sessions, pageviews, users, traffic sources, conversions, geography, devices, and more. Specify the table to query, columns to select, filters, grouping, ordering, date range, and row limit. The app generates the SQL — you just describe what data you need.",
    input_schema: {
      type: "object" as const,
      properties: {
        table: {
          type: "string",
          enum: [
            "sessions", "pageviews", "users", "conversions", "traffic_sources", "events",
            "campaign_performance", "keyword_performance", "click_attribution", "account_info",
            "post_performance", "follower_stats", "follower_demographics", "page_stats", "org_info",
            "campaign_reports", "audience_stats", "audience_growth", "mc_account_info",
            "search_performance", "site_info"
          ],
          description:
            "Which table to query. GA4 tables: 'sessions', 'pageviews', 'users', 'conversions', 'traffic_sources', 'events'. Google Ads tables (if connected): 'campaign_performance' (daily campaign metrics with cost, clicks, impressions, conversions), 'keyword_performance' (daily keyword/ad-group metrics), 'click_attribution' (per-click data with gclid for attribution), 'account_info' (account currency and name).",
        },
        metrics: {
          type: "array",
          items: { type: "string" },
          description:
            'Aggregate metrics to compute, e.g. ["sessions", "users", "pageviews", "bounce_rate", "avg_session_duration", "conversion_value"]. Use COUNT, SUM, AVG as needed.',
        },
        dimensions: {
          type: "array",
          items: { type: "string" },
          description:
            'Columns to group by, e.g. ["source", "medium", "country", "device_category", "page_path", "landing_page", "channel_group"]. Use "date" for time series.',
        },
        startDate: {
          type: "string",
          description:
            'Start date in YYYY-MM-DD format. Defaults to 28 days ago.',
        },
        endDate: {
          type: "string",
          description:
            'End date in YYYY-MM-DD format. Defaults to today.',
        },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", description: "Column name to filter on." },
              operator: {
                type: "string",
                enum: ["=", "!=", ">", "<", ">=", "<=", "LIKE", "IN", "NOT IN"],
                description: "Comparison operator.",
              },
              value: {
                description: "Value to compare against. Use an array for IN/NOT IN operators.",
              },
            },
            required: ["field", "operator", "value"],
          },
          description: "Filters to apply to the query.",
        },
        orderBy: {
          type: "object",
          properties: {
            field: { type: "string", description: "Column name to sort by." },
            direction: {
              type: "string",
              enum: ["ASC", "DESC"],
              description: "Sort direction. Defaults to DESC.",
            },
          },
          required: ["field"],
          description: "How to order the results.",
        },
        limit: {
          type: "number",
          description: "Maximum number of rows to return (default 10, max 500).",
        },
      },
      required: ["table", "metrics"],
    },
  },
  {
    name: "run_ads_query",
    description:
      "Run a custom SQL query that can JOIN Google Ads data with GA4 data. Use this for attribution queries that need to link Ads clicks to website sessions via gclid, or any query that spans both Ads and GA4 tables. Use {dataset}.tableName for table references — the system routes to the correct dataset automatically. Ads tables: campaign_performance, keyword_performance, click_attribution, account_info.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "The SQL query to run. Use {dataset}.tableName for all table references. Example: SELECT cl.campaign_name, e.page_location FROM `{dataset}.click_attribution` cl JOIN `{dataset}.stg_events` e ON cl.gclid = e.gclid",
        },
        description: {
          type: "string",
          description: "Brief description of what this query does, for logging.",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "run_mailchimp_query",
    description:
      "Run a custom SQL query against Mailchimp email marketing data. Use this to answer questions about email campaign performance, audience growth, open rates, click rates, bounces, unsubscribes, and revenue. Use {dataset}.tableName for table references. Mailchimp tables: campaign_reports (per-campaign: send_date, campaign_title, subject_line, emails_sent, opens_total, unique_opens, open_rate, proxy_excluded_open_rate, clicks_total, unique_clicks, click_rate, hard_bounces, soft_bounces, unsubscribed, total_revenue), audience_stats (daily snapshot: member_count, total_contacts, unsubscribe_count, cleaned_count, campaign_count, open_rate, click_rate), audience_growth (monthly: subscribed, unsubscribed, cleaned, pending, deleted), mc_account_info (account/list name, dc, last sync).",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "The SQL query to run. Use {dataset}.tableName for all table references. Example: SELECT campaign_title, emails_sent, unique_opens, open_rate, click_rate FROM `{dataset}.campaign_reports` ORDER BY send_date DESC LIMIT 10",
        },
        description: {
          type: "string",
          description: "Brief description of what this query does, for logging.",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "run_linkedin_query",
    description:
      "Run a custom SQL query against LinkedIn company page analytics data. Use this to answer questions about LinkedIn post performance, follower growth, follower demographics, and page engagement. Use {dataset}.tableName for table references. LinkedIn tables: post_performance (daily post metrics: impressions, clicks, comments, likes, shares, engagements), follower_stats (daily follower gains: organic_gains, paid_gains), follower_demographics (follower breakdowns by country, industry, seniority, function, company_size), page_stats (daily page views, unique visitors, clicks), org_info (organization name and last sync time).",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "The SQL query to run. Use {dataset}.tableName for all table references. Example: SELECT stats_date, organic_gains, paid_gains FROM `{dataset}.follower_stats` ORDER BY stats_date DESC LIMIT 30",
        },
        description: {
          type: "string",
          description: "Brief description of what this query does, for logging.",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "run_gsc_query",
    description:
      "Run a custom SQL query against Google Search Console data. Use this to answer questions about organic search performance: queries, impressions, clicks, CTR, and average position. Use {dataset}.tableName for table references. GSC tables: search_performance (daily search metrics: query_date, query, page, country, device, clicks, impressions, ctr (0-1 decimal), position (lower is better)), site_info (site metadata: site_url, permission_level, last_synced_at).",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "The SQL query to run. Use {dataset}.tableName for all table references. Example: SELECT query, SUM(clicks) as clicks, SUM(impressions) as impressions, AVG(position) as avg_position FROM `{dataset}.search_performance` WHERE query_date >= '2024-01-01' GROUP BY query ORDER BY clicks DESC LIMIT 20",
        },
        description: {
          type: "string",
          description: "Brief description of what this query does, for logging.",
        },
      },
      required: ["sql"],
    },
  },
  {
    name: "get_realtime_data",
    description:
      "Get real-time analytics data showing active users in the last 30 minutes, broken down by page, country, and device. Use this when users ask about current site activity.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_available_fields",
    description:
      "Get the available tables and columns in the analytics dataset. Use this to discover what data is queryable before running a query, or to verify column names.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];
