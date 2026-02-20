/**
 * Alert type definitions and their associated prompts.
 *
 * Each alert type maps to a user-facing label, description, and the
 * prompt that gets sent to Claude along with the GA4 property data.
 */

export interface AlertTypeDefinition {
  key: string;
  label: string;
  description: string;
  /** The prompt sent to Claude to generate the alert email content. */
  prompt: string;
}

export const ALERT_TYPES: Record<string, AlertTypeDefinition> = {
  weekly_snapshot: {
    key: "weekly_snapshot",
    label: "Weekly Snapshot",
    description:
      "A summary of the week's performance compared to the previous week, including traffic, top pages, and traffic sources with recommendations.",
    prompt: `Provide a brief summary of this week's performance and compare it to last week.

Include:
- Overall traffic (users, sessions, page views) for this week vs last week with percentage change
- Top 5 pages by page views for this week
- Sources of traffic (channels breakdown) for this week

Then provide 2-3 actionable recommendations based on the data.

Use the run_report tool to fetch the data. For "this week" use the last 7 days, and for "last week" use the 7 days before that.

Format your response as clean HTML suitable for an email body. Use inline styles only (no classes). Use a clean, professional style with:
- A readable font stack (system fonts)
- Subtle colors (#1a1a1a for text, #666 for secondary text, #f8f9fa for table header backgrounds)
- Simple bordered tables for data
- Percentage changes shown in green (#16a34a) for positive and red (#dc2626) for negative
- Recommendations as a numbered list

Do NOT include any markdown formatting, scorecard blocks, suggested questions, or [[rec]] blocks. Return ONLY clean HTML.`,
  },

  traffic_report: {
    key: "traffic_report",
    label: "Traffic Report",
    description:
      "Detailed traffic breakdown by source, medium, and channel with trends.",
    prompt: `Provide a detailed traffic report for the reporting period.

Include:
- Total users, sessions, and page views
- Breakdown by channel (Organic Search, Direct, Social, Referral, etc.) with session counts and percentage of total
- Top 5 traffic sources (source/medium) by sessions
- Day-over-day trend for the period (a brief note on which days performed best)

Then provide 2-3 recommendations on how to improve traffic.

Use the run_report tool to fetch the data. Use the last 7 days for a weekly report, last 1 day for daily, or last 30 days for monthly.

Format your response as clean HTML suitable for an email body. Use inline styles only (no classes). Use a clean, professional style with:
- A readable font stack (system fonts)
- Subtle colors (#1a1a1a for text, #666 for secondary text, #f8f9fa for table header backgrounds)
- Simple bordered tables for data
- Percentage changes shown in green (#16a34a) for positive and red (#dc2626) for negative
- Recommendations as a numbered list

Do NOT include any markdown formatting, scorecard blocks, suggested questions, or [[rec]] blocks. Return ONLY clean HTML.`,
  },

  top_pages: {
    key: "top_pages",
    label: "Top Pages",
    description:
      "Your best-performing pages ranked by views, with engagement metrics.",
    prompt: `Provide a top pages report for the reporting period.

Include:
- Top 10 pages by page views, showing: page path, page views, users, average session duration, and bounce rate
- A brief summary of which content is performing best and any notable changes
- Any pages that saw significant increases or decreases compared to the previous period

Then provide 2-3 content recommendations based on the data.

Use the run_report tool to fetch the data. Use the last 7 days for a weekly report, last 1 day for daily, or last 30 days for monthly. Run a second report for the previous period for comparison.

Format your response as clean HTML suitable for an email body. Use inline styles only (no classes). Use a clean, professional style with:
- A readable font stack (system fonts)
- Subtle colors (#1a1a1a for text, #666 for secondary text, #f8f9fa for table header backgrounds)
- Simple bordered tables for data
- Percentage changes shown in green (#16a34a) for positive and red (#dc2626) for negative
- Recommendations as a numbered list

Do NOT include any markdown formatting, scorecard blocks, suggested questions, or [[rec]] blocks. Return ONLY clean HTML.`,
  },
};

/** Ordered list of alert types for UI rendering. */
export const ALERT_TYPE_LIST: AlertTypeDefinition[] = Object.values(ALERT_TYPES);

/** Validate that a string is a known alert type key. */
export function isValidAlertType(type: string): boolean {
  return type in ALERT_TYPES;
}
