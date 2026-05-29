/**
 * Report slide definitions.
 *
 * Each slide has:
 * - `htmlTemplate`: HTML/CSS that Claude generated (from a reference image or from scratch)
 *   Uses {{placeholder}} syntax for dynamic data
 * - `dataConfig`: maps placeholders to real data sources
 * - `referenceImage`: optional base64 image the user uploaded as reference
 */

export interface DataBinding {
  placeholder: string;
  source: "bigquery" | "manual" | "goal" | "org" | "static";
  /** For bigquery: SQL query. For manual: metric name. For goal: kpi name. For org: field name. For static: literal value. */
  value: string;
}

export interface SlideDefinition {
  id: string;
  title: string;
  htmlTemplate: string;
  dataBindings: DataBinding[];
  referenceImage?: string; // base64 data URL
}

export interface ReportTemplateData {
  id: string;
  name: string;
  slides: SlideDefinition[];
}

/** Starter slide types for quick-add */
export const STARTER_SLIDES: { label: string; description: string; prompt: string }[] = [
  {
    label: "Title Slide",
    description: "Report title with client name and period",
    prompt: "Create a title slide for a monthly marketing report. Dark background (#0A0A0A), centered layout. Show {{orgName}} as the main title in large white text, {{period}} as subtitle in green (#00A352), and 'Monthly Performance Report' as the tagline. Minimal, modern, editorial design.",
  },
  {
    label: "Executive Summary",
    description: "KPI scorecards with month-over-month change",
    prompt: "Create an executive summary slide with 4 KPI scorecard cards in a row. Dark background (#0A0A0A). Each card has: a label (small, muted), a big number value, and a percentage change (green if positive, red if negative). Cards have dark surface background (#141414) with subtle border. Use placeholders: {{metric1_label}}, {{metric1_value}}, {{metric1_change}}, {{metric2_label}}, {{metric2_value}}, {{metric2_change}}, {{metric3_label}}, {{metric3_value}}, {{metric3_change}}, {{metric4_label}}, {{metric4_value}}, {{metric4_change}}. Modern, clean, data-dense.",
  },
  {
    label: "Channel Performance",
    description: "Comparison table with last month vs this month",
    prompt: "Create a channel performance table slide. Dark background (#0A0A0A). Title: {{slide_title}}. Table with columns: Metric, Last Month, This Month, % Change. Rows use placeholders like {{row1_metric}}, {{row1_last}}, {{row1_current}}, {{row1_change}}. Support up to 6 rows. % Change column is green for positive, red for negative. Clean table with subtle borders (#2A2A2A). Dark surface (#141414) for header row.",
  },
  {
    label: "Goal Progress",
    description: "Goal cards with progress bars",
    prompt: "Create a goal progress slide showing {{goals_html}} — a grid of goal cards. Dark background (#0A0A0A). Each card has: goal name, current value / target, a progress bar (green if ≥90%, amber if ≥60%, red otherwise), and percentage. 2-column grid layout. Cards on dark surface (#141414) with subtle border.",
  },
  {
    label: "AI Insights",
    description: "AI-generated analysis and recommendations",
    prompt: "Create an insights slide. Dark background (#0A0A0A). Title: 'Insights & Recommendations'. Body area showing {{insights}} as bullet points. Clean typography, generous line spacing. Use a subtle left green (#00A352) accent border for the content area. Modern, readable.",
  },
];
