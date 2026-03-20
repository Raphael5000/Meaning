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
            "ads_campaign_performance", "ads_keyword_performance", "ads_ga4_attribution", "ads_attribution_summary"
          ],
          description:
            "Which analytics table to query. 'sessions' for session-level data. 'pageviews' for page-level data. 'users' for user-level aggregates. 'conversions' for conversion events. 'traffic_sources' for pre-aggregated daily source/medium performance. 'events' for raw event data. 'ads_campaign_performance' for daily Google Ads campaign metrics (impressions, clicks, cost, CTR, CPC, ROAS). 'ads_keyword_performance' for keyword-level Ads metrics. 'ads_ga4_attribution' for GA4 sessions attributed to Ads clicks via gclid. 'ads_attribution_summary' for aggregated campaign attribution with ROI.",
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
