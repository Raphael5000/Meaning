/**
 * Report template slide definitions.
 * Each slide has a `type` that determines layout and a `config` with data source settings.
 */

export type SlideType =
  | "title"
  | "scorecard-row"
  | "channel-table"
  | "goals-grid"
  | "bar-chart"
  | "line-chart"
  | "campaign-table"
  | "ai-insights";

export interface TitleSlideConfig {
  subtitle?: string;
}

export interface ScorecardRowConfig {
  metrics: ScorecardMetric[];
}

export interface ScorecardMetric {
  label: string;
  source: "bigquery" | "manual" | "goal";
  /** For bigquery: SQL query or table+metric. For manual: metricId. For goal: kpiId. */
  sourceId?: string;
  query?: string;
}

export interface ChannelTableConfig {
  sourceType: string; // e.g. "GOOGLE_ADS", "SEARCH_CONSOLE", "LINKEDIN"
  metrics: string[]; // e.g. ["impressions", "clicks", "ctr", "cpc"]
  compare: "MoM" | "QoQ";
}

export interface GoalsGridConfig {
  /** If empty, include all goals */
  kpiIds?: string[];
}

export interface ChartSlideConfig {
  /** Dashboard widget ID to pull chart from, OR manual metric IDs */
  widgetId?: string;
  manualMetricIds?: string[];
  title?: string;
}

export interface CampaignTableConfig {
  sourceType: string;
  limit?: number;
}

export interface AiInsightsConfig {
  prompt?: string;
}

export interface SlideDefinition {
  id: string;
  type: SlideType;
  title: string;
  config: TitleSlideConfig | ScorecardRowConfig | ChannelTableConfig |
    GoalsGridConfig | ChartSlideConfig | CampaignTableConfig | AiInsightsConfig;
}

export interface ReportTemplateData {
  id: string;
  name: string;
  slides: SlideDefinition[];
}

/** Slide type metadata for the template builder UI */
export const SLIDE_TYPES: { type: SlideType; label: string; description: string }[] = [
  { type: "title", label: "Title Slide", description: "Report title with client name and period" },
  { type: "scorecard-row", label: "Scorecards", description: "Big number KPI cards with month-over-month change" },
  { type: "goals-grid", label: "Goal Progress", description: "Goal cards with progress bars and status" },
  { type: "channel-table", label: "Channel Performance", description: "Metric comparison table for a data source" },
  { type: "bar-chart", label: "Bar Chart", description: "Bar chart from dashboard widget or manual metrics" },
  { type: "line-chart", label: "Line Chart", description: "Trend line chart from dashboard widget" },
  { type: "campaign-table", label: "Campaign Breakdown", description: "Campaign-level performance table" },
  { type: "ai-insights", label: "AI Insights", description: "AI-generated analysis and recommendations" },
];
