import Anthropic from "@anthropic-ai/sdk";

/** Tool definitions exposed to Claude for GA4 querying. */
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
