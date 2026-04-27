"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn, Mark } from "../primitives";
import { Sparkline } from "../attachments";
import type {
  EmailPayload,
  PreviewKpiData,
  PreviewMover,
} from "@/lib/email-payload";

export type { PreviewKpiData, PreviewMover };

/** Component props = the shared EmailPayload + a width override. */
export type EmailPreviewProps = EmailPayload & {
  /** Render at fixed max-width 520, soft drop shadow. */
  width?: number;
};

/**
 * The email preview card — used both in the create flow's right column
 * (as the live preview) and in the detail screen (as the actual rendered
 * last-sent email). Pure-presentation: takes a fully-shaped payload and
 * draws it. Conversion from form values → payload happens in the caller
 * (see `previewFromForm()` below).
 */
export function EmailPreview({
  subject,
  weekLabel,
  headline,
  lede,
  kpis,
  trendPoints,
  trendLabel = "Sessions · last 7 days",
  movers,
  width = 520,
}: EmailPreviewProps) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: width,
        background: "var(--v2-surface)",
        border: "1px solid var(--v2-line)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow:
          "0 24px 50px -18px rgba(0,0,0,0.45), 0 0 0 1px var(--v2-line)",
        fontFamily: "var(--v2-font-sans)",
      }}
    >
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--v2-line)",
          fontSize: 11,
          color: "var(--v2-ink-muted)",
          fontFamily: "var(--v2-font-mono)",
        }}
      >
        <div>From  Meaning &lt;alerts@usemeaning.io&gt;</div>
        <div style={{ color: "var(--v2-ink)" }}>Subject  {subject}</div>
      </div>

      <div style={{ padding: "28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <Mark size={18} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Meaning</span>
          <span style={{ flex: 1 }} />
          {weekLabel && <span className="kicker">{weekLabel}</span>}
        </div>

        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--v2-ink)",
            lineHeight: 1.2,
          }}
        >
          {headline}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: "var(--v2-ink-muted)",
            lineHeight: 1.55,
          }}
        >
          {lede}
        </p>

        {kpis.length > 0 && (
          <div
            style={{
              marginTop: 20,
              padding: "14px 0",
              borderTop: "1px solid var(--v2-line)",
              borderBottom: "1px solid var(--v2-line)",
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
              gap: 8,
            }}
          >
            {kpis.slice(0, 4).map((k) => (
              <PreviewKpi key={k.label} {...k} />
            ))}
          </div>
        )}

        {trendPoints && trendPoints.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <div className="kicker" style={{ marginBottom: 6 }}>
              {trendLabel}
            </div>
            <div
              style={{
                padding: 8,
                border: "1px solid var(--v2-line)",
                borderRadius: 8,
                background: "var(--v2-bg)",
              }}
            >
              <Sparkline points={trendPoints} w={440} h={70} />
            </div>
          </div>
        )}

        {movers && movers.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>
              Top movers
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {movers.map((m) => (
                <MoverLine key={m.page} {...m} />
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--v2-line)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Btn
            variant="primary"
            size="sm"
            icon={<I.ArrowUpR size={11} />}
          >
            Open in Meaning
          </Btn>
          <Btn variant="outline" size="sm">
            Ask a follow-up
          </Btn>
          <span style={{ flex: 1 }} />
          <span
            style={{
              fontSize: 10,
              color: "var(--v2-ink-subtle)",
              fontFamily: "var(--v2-font-mono)",
            }}
          >
            Unsubscribe
          </span>
        </div>
      </div>
    </div>
  );
}

function PreviewKpi({ label, value, change }: PreviewKpiData) {
  // Negative-and-not-points (raw negative on rate metrics is good, e.g.
  // "-1.8pt" on bounce rate is a positive change). Convention: any negative
  // delta on a percent-change reads as red unless suffixed with "pt".
  const neg = change.startsWith("-") && !change.includes("pt");
  return (
    <div>
      <div className="kicker" style={{ marginBottom: 3, fontSize: 9 }}>
        {label}
      </div>
      <div
        className="num"
        style={{
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--v2-ink)",
        }}
      >
        {value}
      </div>
      <div
        className="num"
        style={{
          fontSize: 10,
          color: neg ? "var(--v2-neg)" : "var(--v2-pos)",
          marginTop: 1,
        }}
      >
        {change}
      </div>
    </div>
  );
}

function MoverLine({ page, value, delta }: PreviewMover) {
  const neg = delta.startsWith("-");
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5 }}
    >
      <span
        style={{
          flex: 1,
          color: "var(--v2-ink)",
          fontFamily: "var(--v2-font-mono)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {page}
      </span>
      <span
        className="num"
        style={{ width: 70, textAlign: "right", color: "var(--v2-ink)" }}
      >
        {value}
      </span>
      <span
        className="num"
        style={{
          width: 50,
          textAlign: "right",
          color: neg ? "var(--v2-neg)" : "var(--v2-pos)",
        }}
      >
        {delta}
      </span>
    </div>
  );
}

/**
 * Empty-state card shown in the create flow before the user types or picks
 * a template. Dashed border + sparkle icon + one-line nudge.
 */
export function EmailPreviewPlaceholder({ width = 520 }: { width?: number }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: width,
        minHeight: 540,
        background: "var(--v2-surface)",
        border: "1px dashed var(--v2-line-strong)",
        borderRadius: 14,
        padding: "40px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 14,
        fontFamily: "var(--v2-font-sans)",
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 999,
          border: "1px dashed var(--v2-line-strong)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--v2-ink-muted)",
        }}
      >
        <I.Sparkle size={16} />
      </div>
      <div
        style={{
          fontSize: 14,
          color: "var(--v2-ink-muted)",
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        Start typing — the email preview will build itself here.
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Mock-content helpers — pure functions that turn form values (alert type +
// custom prompt + name) into a stable preview payload. Client-side only;
// no LLM round-trip per keystroke. The actual delivered email comes from
// the server in Phase C.
// ----------------------------------------------------------------------------

const DEMO_TREND = [142, 156, 138, 172, 161, 188, 195];

interface MockArgs {
  name: string;
  alertType: string;
  customPrompt?: string;
}

export function previewFromForm({
  name,
  alertType,
  customPrompt,
}: MockArgs): EmailPreviewProps {
  const today = new Date();
  const week = isoWeek(today);
  const weekLabel = `Week ${week}`;
  const dateRange = formatRange(today);

  if (alertType === "weekly_snapshot") {
    return {
      subject: `${name || "Weekly snapshot"} — ${dateRange}`,
      weekLabel,
      headline: "Traffic held steady; paid search did the lifting.",
      lede:
        "Sessions +8.1% week-over-week. Paid search drove most of the gain as organic plateaued. Bounce rate ticked down 1.8 pts.",
      kpis: [
        { label: "Sessions", value: "318,902", change: "+8.1%" },
        { label: "Users", value: "124,418", change: "+12.4%" },
        { label: "Bounce", value: "42.6%", change: "-1.8pt" },
        { label: "Conv.", value: "3.42%", change: "+0.3pt" },
      ],
      trendPoints: DEMO_TREND,
      movers: [
        { page: "/pricing", value: "18,402", delta: "+42%" },
        { page: "/blog/new-campaign", value: "12,108", delta: "+28%" },
        { page: "/features/dashboards", value: "9,817", delta: "+9%" },
        { page: "/", value: "8,412", delta: "-3%" },
      ],
    };
  }

  if (alertType === "traffic_report") {
    return {
      subject: `${name || "Traffic report"} — ${dateRange}`,
      weekLabel,
      headline: "Direct climbed past organic for the first time this quarter.",
      lede:
        "Direct visitors made up 38% of sessions this week, edging organic search at 35%. Paid social held flat.",
      kpis: [
        { label: "Direct", value: "121,302", change: "+18%" },
        { label: "Organic", value: "111,840", change: "+2%" },
        { label: "Paid", value: "62,108", change: "+11%" },
        { label: "Referral", value: "23,652", change: "-4%" },
      ],
      trendPoints: DEMO_TREND,
      trendLabel: "Sessions by source · last 7 days",
    };
  }

  if (alertType === "top_pages") {
    return {
      subject: `${name || "Top pages"} — ${dateRange}`,
      weekLabel,
      headline: "Pricing held the top spot; new blog post broke into top 3.",
      lede:
        "/pricing kept its #1 ranking by sessions. The freshly-published /blog/new-campaign jumped to #2 within 4 days of launch.",
      kpis: [
        { label: "Pages", value: "38", change: "+5" },
        { label: "Top page", value: "/pricing", change: "+18%" },
        { label: "Avg conv.", value: "3.42%", change: "+0.3pt" },
        { label: "Sessions", value: "318,902", change: "+8.1%" },
      ],
      movers: [
        { page: "/pricing", value: "18,402", delta: "+18%" },
        { page: "/blog/new-campaign", value: "12,108", delta: "+42%" },
        { page: "/features/dashboards", value: "9,817", delta: "+9%" },
        { page: "/", value: "8,412", delta: "-3%" },
        { page: "/blog/q4-retrospective", value: "7,304", delta: "+12%" },
      ],
    };
  }

  // Custom — derive a generic "your custom report" preview from the prompt.
  const trimmed = (customPrompt ?? "").trim();
  const hasPrompt = trimmed.length > 0;
  return {
    subject: `${name || "Custom report"} — ${dateRange}`,
    weekLabel,
    headline: hasPrompt
      ? truncate(toSentence(trimmed), 90)
      : "Your custom report.",
    lede: hasPrompt
      ? "We'll send you exactly what you asked for, with the latest data, on the schedule below."
      : "Describe the report you want above. The preview will update as you type.",
    kpis: hasPrompt
      ? [
          { label: "Metric 1", value: "—", change: "+0%" },
          { label: "Metric 2", value: "—", change: "+0%" },
          { label: "Metric 3", value: "—", change: "+0%" },
          { label: "Metric 4", value: "—", change: "+0%" },
        ]
      : [],
    trendPoints: hasPrompt ? DEMO_TREND : undefined,
    trendLabel: "Live numbers will appear here once you save",
  };
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatRange(d: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `week of ${d.toLocaleDateString(undefined, opts)}`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function toSentence(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  const first = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(first) ? first : first + ".";
}
