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

/**
 * Shared HTML email styling rules — single source of truth for every
 * report type (system and custom). These rules are appended to every
 * prompt so the generated email always has a consistent look and feel.
 */
const EMAIL_STYLE_RULES = `Format your response as clean HTML suitable for an email body. Follow these styling rules exactly:

Structure:
- Start with a short 1-2 sentence overview paragraph summarising the key takeaway from the data.
- Use <h3> tags for section headings (e.g. "Traffic Overview", "Observations", "Recommendations"). Do NOT use <h1> or <h2> — those are reserved for the email wrapper.
- Present data in tables where appropriate.
- After the data, include an "Observations" section with bullet points (<ul>) highlighting notable patterns, changes, or anomalies.
- End with a "Recommendations" section with bullet points (<ul>) of actionable next steps based on the data.

Styling (inline styles only, no CSS classes):
- Font: font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
- Text color: #1a1a1a for body text, #666 for secondary/muted text.
- Section headings (<h3>): color: #1a1a1a; font-size: 16px; font-weight: 600; margin: 24px 0 8px 0;
- Paragraphs: font-size: 15px; line-height: 1.6; color: #333;
- Tables: width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;
- Table header row: background: #f8f9fa;
- Table header cells (<th>): text-align: left; padding: 10px 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1a1a1a;
- Table body cells (<td>): padding: 10px 12px; border: 1px solid #e5e7eb;
- Right-align numeric columns with text-align: right on both <th> and <td>.
- Percentage changes: green (#16a34a) for positive, red (#dc2626) for negative.
- Bullet lists (<ul>): padding-left: 20px; margin: 8px 0; and <li>: font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 6px;
- Format large numbers with commas (e.g. 1,234).

Do NOT include any markdown formatting, code fences, scorecard blocks, suggested questions, or [[rec]] blocks. Return ONLY clean HTML.`;

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

Use the run_report tool to fetch the data. For "this week" use the last 7 days, and for "last week" use the 7 days before that.

${EMAIL_STYLE_RULES}`,
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

Use the run_report tool to fetch the data. Use the last 7 days for a weekly report, last 1 day for daily, or last 30 days for monthly.

${EMAIL_STYLE_RULES}`,
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

Use the run_report tool to fetch the data. Use the last 7 days for a weekly report, last 1 day for daily, or last 30 days for monthly. Run a second report for the previous period for comparison.

${EMAIL_STYLE_RULES}`,
  },

  custom: {
    key: "custom",
    label: "Custom Report",
    description:
      "Write your own prompt to get a personalised report with the data you care about.",
    prompt: "", // Placeholder — the actual prompt comes from the user's customPrompt field
  },
};

/** Ordered list of alert types for UI rendering. */
export const ALERT_TYPE_LIST: AlertTypeDefinition[] = Object.values(ALERT_TYPES);

/** Validate that a string is a known alert type key. */
export function isValidAlertType(type: string): boolean {
  return type in ALERT_TYPES;
}

/**
 * Build the final prompt for a custom report by wrapping the user's
 * natural-language request with formatting instructions so the email
 * output is always well-structured HTML.
 */
export function buildCustomPrompt(userPrompt: string): string {
  return `The user has requested a custom analytics report. Here is what they want:

---
${userPrompt}
---

Use the run_report tool (and run_realtime_report or get_metadata if useful) to fetch the relevant data from Google Analytics, then write a clear, professional report that answers the user's request.

Follow the user's request for what data and insights to include, but always use the structure and styling below.

${EMAIL_STYLE_RULES}`;
}
