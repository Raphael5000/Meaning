import type { ChartTypeId } from "@/components/v2/dashboard/AddWidgetDialog";

interface WidgetSpec {
  prompt: string;
  chartType: ChartTypeId;
}

/**
 * Returns a list of widget prompts to auto-generate for a template dashboard
 * based on the dashboard type and connected data sources.
 */
export function getTemplateWidgets(
  dashboardType: "monthly" | "yearly",
  connectedSources: string[],
): WidgetSpec[] {
  const has = (t: string) => connectedSources.includes(t);
  const widgets: WidgetSpec[] = [];

  if (dashboardType === "monthly") {
    // ── GA4 ──
    if (has("GA4_BIGQUERY")) {
      widgets.push({ prompt: "Website sessions this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Website users this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Daily website sessions this month", chartType: "line" });
    }

    // ── Google Ads ──
    if (has("GOOGLE_ADS")) {
      widgets.push({ prompt: "Google Ads total spend this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Google Ads total clicks this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Google Ads average CPC this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Google Ads impressions this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Daily Google Ads spend this month", chartType: "line" });
      widgets.push({ prompt: "Campaign performance this month — top 10 campaigns by spend, show impressions, clicks, cost, CPC, and conversions", chartType: "table" });
    }

    // ── Microsoft Ads ──
    if (has("MICROSOFT_ADS")) {
      widgets.push({ prompt: "Microsoft Ads total spend this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Microsoft Ads clicks this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Daily Microsoft Ads spend this month", chartType: "line" });
    }

    // ── Search Console ──
    if (has("SEARCH_CONSOLE")) {
      widgets.push({ prompt: "Google Search Console total clicks this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Google Search Console average position this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Top 10 search queries this month by clicks with impressions and average position", chartType: "table" });
    }

    // ── LinkedIn ──
    if (has("LINKEDIN")) {
      widgets.push({ prompt: "LinkedIn total followers — current count", chartType: "scorecard" });
      widgets.push({ prompt: "LinkedIn post impressions this month vs last month", chartType: "scorecard" });
    }

    // ── Mailchimp ──
    if (has("MAILCHIMP")) {
      widgets.push({ prompt: "Mailchimp emails sent this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Mailchimp average open rate this month vs last month", chartType: "scorecard" });
    }

    // ── Attio CRM ──
    if (has("ATTIO")) {
      widgets.push({ prompt: "New CRM deals created this month vs last month", chartType: "scorecard" });
      widgets.push({ prompt: "Total pipeline value of open deals", chartType: "scorecard" });
    }

    // ── Ahrefs ──
    if (has("AHREFS")) {
      widgets.push({ prompt: "Domain rating — current score", chartType: "scorecard" });
      widgets.push({ prompt: "Organic keywords this month vs last month", chartType: "scorecard" });
    }

    // ── Cross-source ──
    if (has("GOOGLE_ADS") && has("ATTIO")) {
      widgets.push({ prompt: "Cost per inbound lead: Google Ads spend this month divided by inbound CRM deals created this month, vs last month", chartType: "scorecard" });
    }
  } else {
    // ── YEARLY ──

    // ── GA4 ──
    if (has("GA4_BIGQUERY")) {
      widgets.push({ prompt: "Website sessions year to date vs same period last year", chartType: "scorecard" });
      widgets.push({ prompt: "Website users year to date vs same period last year", chartType: "scorecard" });
      widgets.push({ prompt: "Monthly website sessions trend this year (bar chart)", chartType: "bar" });
    }

    // ── Google Ads ──
    if (has("GOOGLE_ADS")) {
      widgets.push({ prompt: "Google Ads total spend year to date vs same period last year", chartType: "scorecard" });
      widgets.push({ prompt: "Google Ads total clicks year to date vs same period last year", chartType: "scorecard" });
      widgets.push({ prompt: "Monthly Google Ads spend trend this year (bar chart)", chartType: "bar" });
      widgets.push({ prompt: "Campaign performance year to date — top 10 campaigns by spend, show impressions, clicks, cost, CPC, and conversions", chartType: "table" });
    }

    // ── Microsoft Ads ──
    if (has("MICROSOFT_ADS")) {
      widgets.push({ prompt: "Microsoft Ads total spend year to date vs same period last year", chartType: "scorecard" });
      widgets.push({ prompt: "Monthly Microsoft Ads spend trend this year (bar chart)", chartType: "bar" });
    }

    // ── Search Console ──
    if (has("SEARCH_CONSOLE")) {
      widgets.push({ prompt: "Google Search Console total clicks year to date vs same period last year", chartType: "scorecard" });
      widgets.push({ prompt: "Monthly GSC clicks trend this year (line chart)", chartType: "line" });
    }

    // ── LinkedIn ──
    if (has("LINKEDIN")) {
      widgets.push({ prompt: "LinkedIn total followers — current count", chartType: "scorecard" });
      widgets.push({ prompt: "Monthly LinkedIn post impressions this year (bar chart)", chartType: "bar" });
    }

    // ── Mailchimp ──
    if (has("MAILCHIMP")) {
      widgets.push({ prompt: "Mailchimp total emails sent year to date vs same period last year", chartType: "scorecard" });
      widgets.push({ prompt: "Monthly Mailchimp open rate this year (line chart)", chartType: "line" });
    }

    // ── Attio CRM ──
    if (has("ATTIO")) {
      widgets.push({ prompt: "Total CRM deals created year to date vs same period last year", chartType: "scorecard" });
      widgets.push({ prompt: "Monthly new deals trend this year (bar chart)", chartType: "bar" });
    }

    // ── Ahrefs ──
    if (has("AHREFS")) {
      widgets.push({ prompt: "Domain rating — current score", chartType: "scorecard" });
      widgets.push({ prompt: "Monthly organic traffic trend this year (line chart)", chartType: "line" });
    }

    // ── Cross-source ──
    if (has("GOOGLE_ADS") && has("ATTIO")) {
      widgets.push({ prompt: "Cost per inbound lead: Google Ads spend year to date divided by inbound CRM deals created year to date, vs same period last year", chartType: "scorecard" });
    }
  }

  return widgets;
}
