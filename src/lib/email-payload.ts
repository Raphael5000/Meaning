/**
 * Shared shape between the live email preview (React, in browser) and the
 * delivered email (HTML strings, server-side rendered into Resend). Both
 * surfaces consume this exact payload — what you see in the preview is what
 * lands in the inbox.
 *
 * The LLM is forced to produce one of these via the `compose_email_report`
 * tool (see `alert-content.ts`). No markdown parsing — structured output.
 */
export interface EmailPayload {
  /** Email subject line (full, ready to send) */
  subject: string;
  /** Small label rendered top-right of the email body, e.g. "Week 17" */
  weekLabel?: string;
  /** Bold hero h2 — the AI's plain-English headline */
  headline: string;
  /** Supporting paragraph under the headline */
  lede: string;
  /** Up to 4 KPIs shown as a strip near the top */
  kpis: PreviewKpiData[];
  /** 7-ish points for the inline sparkline. Optional. */
  trendPoints?: number[];
  /** Caption above the sparkline */
  trendLabel?: string;
  /** Optional list of "top mover" rows (page + value + delta) */
  movers?: PreviewMover[];
}

export interface PreviewKpiData {
  label: string;
  /** Pre-formatted value string, e.g. "318,902", "42.6%", "$2.41" */
  value: string;
  /** Pre-formatted delta with sign + unit, e.g. "+8.1%", "-1.8pt", "+$0.08" */
  change: string;
}

export interface PreviewMover {
  /** Page path or label */
  page: string;
  value: string;
  delta: string;
}

/**
 * JSON schema for the `compose_email_report` tool. Anthropic's tool-use API
 * lets us force the model to call this tool, producing a typed payload
 * without parsing markdown.
 */
export const COMPOSE_EMAIL_TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    subject: {
      type: "string",
      description:
        "Email subject line. Concise, specific, includes the date range when relevant. Example: 'Monday traffic brief — week of Apr 21'.",
    },
    weekLabel: {
      type: "string",
      description:
        "Optional small label for top-right of the body, e.g. 'Week 17' or 'Apr 14–21'. Keep it ≤8 chars.",
    },
    headline: {
      type: "string",
      description:
        "Bold one-sentence headline summarising the most important finding. Plain English, no jargon, ≤90 chars. Example: 'Traffic held steady; paid search did the lifting.'",
    },
    lede: {
      type: "string",
      description:
        "1-2 sentence paragraph under the headline that adds context with specific numbers. Example: 'Sessions +8.1% WoW. Paid search drove most of the gain as organic plateaued.'",
    },
    kpis: {
      type: "array",
      description:
        "Up to 4 key metrics to highlight. Pick the most informative for the report's purpose. Each has a short label, a pre-formatted value string, and a delta string with sign + unit.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Short metric label, e.g. 'Sessions', 'Bounce'." },
          value: {
            type: "string",
            description:
              "Pre-formatted value with thousands separators and any unit, e.g. '318,902', '42.6%', '$2.41'.",
          },
          change: {
            type: "string",
            description:
              "Pre-formatted delta with sign + unit. Use '%' for percentage changes, 'pt' for percentage-point changes (rates), and a leading '+' or '-'. Examples: '+8.1%', '-1.8pt', '+$0.08'.",
          },
        },
        required: ["label", "value", "change"],
      },
      maxItems: 4,
    },
    trendPoints: {
      type: "array",
      description:
        "7-30 numeric points for the inline sparkline. Order chronologically (oldest → newest). Use the same metric as the first KPI. Omit if you don't have time-series data.",
      items: { type: "number" },
    },
    trendLabel: {
      type: "string",
      description:
        "Caption above the sparkline. Default to 'Sessions · last 7 days' if omitted.",
    },
    movers: {
      type: "array",
      description:
        "Optional list of 3-5 'top mover' rows (page paths, channels, campaigns) with their value and a signed delta. Only include if you have row-level data and it adds to the report.",
      items: {
        type: "object",
        properties: {
          page: { type: "string" },
          value: { type: "string" },
          delta: { type: "string" },
        },
        required: ["page", "value", "delta"],
      },
      maxItems: 6,
    },
  },
  required: ["subject", "headline", "lede", "kpis"],
};

/** A type-safe helper to validate / coerce LLM tool output into EmailPayload. */
export function coerceEmailPayload(raw: unknown): EmailPayload {
  const o = (raw as Record<string, unknown>) ?? {};
  const payload: EmailPayload = {
    subject: String(o.subject ?? "Your alert"),
    weekLabel: typeof o.weekLabel === "string" ? o.weekLabel : undefined,
    headline: String(o.headline ?? ""),
    lede: String(o.lede ?? ""),
    kpis: Array.isArray(o.kpis)
      ? (o.kpis as Record<string, unknown>[]).slice(0, 4).map((k) => ({
          label: String(k.label ?? ""),
          value: String(k.value ?? "—"),
          change: String(k.change ?? ""),
        }))
      : [],
    trendPoints: Array.isArray(o.trendPoints)
      ? (o.trendPoints as unknown[])
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n))
      : undefined,
    trendLabel: typeof o.trendLabel === "string" ? o.trendLabel : undefined,
    movers: Array.isArray(o.movers)
      ? (o.movers as Record<string, unknown>[]).slice(0, 6).map((m) => ({
          page: String(m.page ?? ""),
          value: String(m.value ?? ""),
          delta: String(m.delta ?? ""),
        }))
      : undefined,
  };
  return payload;
}
