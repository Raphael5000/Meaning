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
            "campaign_performance", "keyword_performance", "click_attribution", "account_info"
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
