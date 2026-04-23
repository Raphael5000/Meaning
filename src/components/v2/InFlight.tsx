"use client";

import * as React from "react";
import { I } from "./icons";
import { ThinkingBlob } from "./primitives";
import { Button } from "./ui/button";

/* =============================================================
   THINKING — the single in-flight indicator. Styled like a status
   label (muted, small, single-ish line). When `streamingText` is
   provided, the model's incoming prose is shown in the same
   muted style — clamped to ~2 lines and with markdown syntax
   stripped, so tables / insight JSON / code never bloat this
   indicator. The full rendered answer appears in a proper
   AssistantMsg bubble once the stream resolves.
   ============================================================= */

/** Strip markdown so streaming text reads as plain prose inline.
 *  Keeps it visually a "status" line, never a full table / JSON. */
function stripMarkdown(s: string): string {
  return s
    // hide any structured [[...]] blocks entirely (insight JSON, rec, etc.)
    .replace(/\[\[[\s\S]*$/, "")
    // code fences + inline code
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // headings
    .replace(/^#{1,6}\s+/gm, "")
    // bold / italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // table pipes — collapse into a readable run
    .replace(/\|/g, " · ")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/** Show only the MOST RECENT ~220 chars of narration so the user sees the
 *  model's current thought, not a stale first sentence frozen behind an
 *  ellipsis. Break on the last sentence boundary when possible.          */
function tailPrefix(s: string, max = 220): string {
  if (s.length <= max) return s;
  const tail = s.slice(-max);
  // prefer to start at the next sentence boundary inside the tail, so we
  // don't begin mid-word
  const boundary = tail.search(/[.!?]\s+\S/);
  if (boundary >= 0 && boundary < max - 40) {
    return "…" + tail.slice(boundary + 2);
  }
  const space = tail.indexOf(" ");
  return "…" + (space >= 0 ? tail.slice(space + 1) : tail);
}

export function Thinking({
  status,
  streamingText,
}: {
  status?: string | null;
  streamingText?: string;
}) {
  const cleaned = streamingText ? tailPrefix(stripMarkdown(streamingText)) : "";
  const hasStream = cleaned.length > 0;
  const label = hasStream ? cleaned : status || "Thinking…";
  return (
    <div className="relative mx-auto w-full max-w-[780px] py-3">
      <div
        className="absolute top-3 hidden md:block"
        style={{ right: "calc(100% + 8px)" }}
      >
        <ThinkingBlob size={20} />
      </div>
      <div className="flex items-start gap-3 md:block">
        <span className="md:hidden mt-[2px] flex-shrink-0">
          <ThinkingBlob size={20} />
        </span>
        <span
          className="text-[12px] text-v2-ink-muted"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.5,
            minWidth: 0,
          }}
        >
          {label}
          {hasStream && <span className="caret" />}
        </span>
      </div>
    </div>
  );
}

/* =============================================================
   STAGES — multi-step tool-call progress
   ============================================================= */

export interface Stage {
  id: string;
  label: string;
  detail?: string;
  status: "done" | "active" | "pending";
  /** Seconds */
  duration?: number;
}

export function Stages({
  steps,
  title = "Working",
}: {
  steps: Stage[];
  title?: string;
}) {
  const activeIdx = steps.findIndex((s) => s.status === "active");
  const doneCount = steps.filter((s) => s.status === "done").length;
  const totalDur = steps.reduce((acc, s) => acc + (s.duration ?? 0), 0);

  return (
    <div
      style={{
        marginBottom: 14,
        border: "1px solid var(--v2-line)",
        borderRadius: 12,
        background: "var(--v2-surface)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--v2-line)",
          background: "var(--v2-surface-2)",
        }}
      >
        {activeIdx >= 0 ? (
          <ThinkingBlob size={18} />
        ) : (
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              borderRadius: 999,
              background: "var(--v2-ink-subtle)",
            }}
          />
        )}
        <span
          style={{
            fontFamily: "var(--v2-font-sans)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--v2-ink)",
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: "var(--v2-font-mono)",
            fontSize: 10,
            color: "var(--v2-ink-subtle)",
          }}
        >
          {activeIdx >= 0
            ? `${doneCount + 1}/${steps.length}`
            : `${steps.length} · ${totalDur.toFixed(1)}s`}
        </span>
      </div>

      <ol style={{ listStyle: "none", margin: 0, padding: "4px 0" }}>
        {steps.map((s, i) => {
          const isActive = s.status === "active";
          const isDone = s.status === "done";
          const isPending = s.status === "pending";
          const isLast = i === steps.length - 1;
          return (
            <li
              key={s.id}
              style={{
                position: "relative",
                padding: "5px 10px 5px 32px",
                opacity: isPending ? 0.45 : 1,
              }}
            >
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: 15,
                    top: 17,
                    bottom: -3,
                    width: 1,
                    background: "var(--v2-line)",
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  left: 9,
                  top: 7,
                  width: 13,
                  height: 13,
                  borderRadius: 999,
                  background: isDone
                    ? "var(--v2-brand-vivid)"
                    : isActive
                      ? "var(--v2-surface)"
                      : "var(--v2-surface-2)",
                  border: isActive
                    ? "1.5px solid var(--v2-brand-vivid)"
                    : isDone
                      ? "none"
                      : "1px solid var(--v2-line-strong)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isActive
                    ? "0 0 0 3px color-mix(in oklab, var(--v2-brand-vivid) 20%, transparent)"
                    : "none",
                }}
              >
                {isDone && (
                  <I.Check
                    size={8}
                    stroke={3.5}
                    style={{ color: "var(--v2-on-brand)" }}
                  />
                )}
                {isActive && (
                  <span
                    className="pulse-dot"
                    style={{
                      width: 4,
                      height: 4,
                      background: "var(--v2-brand-vivid)",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--v2-font-sans)",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    color: "var(--v2-ink)",
                    lineHeight: 1.4,
                    flexShrink: 0,
                  }}
                >
                  {s.label}
                </span>
                {s.detail && (
                  <span
                    style={{
                      fontFamily: "var(--v2-font-mono)",
                      fontSize: 10.5,
                      color: "var(--v2-ink-muted)",
                      lineHeight: 1.4,
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.detail}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "var(--v2-font-mono)",
                    fontSize: 10.5,
                    color: isActive
                      ? "var(--v2-brand)"
                      : "var(--v2-ink-subtle)",
                    flexShrink: 0,
                  }}
                >
                  {isDone && s.duration != null && `${s.duration.toFixed(1)}s`}
                  {isActive && "…"}
                  {isPending && "·"}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* =============================================================
   CHART SKELETON (while a chart is being built)
   ============================================================= */

export function ChartSkeleton() {
  return (
    <div
      className="bw-card"
      style={{ marginBottom: 12, overflow: "hidden" }}
    >
      <div
        style={{
          padding: "14px 16px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div className="kicker" style={{ marginBottom: 3 }}>
            Chart
          </div>
          <div style={{ fontSize: 14, color: "var(--v2-ink-muted)" }}>
            Building visualisation…
          </div>
        </div>
        <span className="pulse-dot" />
      </div>
      <div style={{ borderTop: "1px solid var(--v2-line)" }} />
      <div
        className="shimmer"
        style={{
          height: 220,
          padding: 16,
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        {[40, 62, 48, 78, 55, 90, 68, 82, 72, 95, 88, 100].map((h, i) => (
          <div
            key={i}
            className="barpulse"
            style={{
              flex: 1,
              height: `${h}%`,
              background: "var(--v2-line-strong)",
              borderRadius: 2,
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* =============================================================
   ERROR BANNER
   ============================================================= */

export function ErrorBanner({
  title = "Something went wrong",
  detail,
  onRetry,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        marginBottom: 12,
        borderRadius: 10,
        border: "1px solid var(--v2-neg)",
        background: "var(--v2-neg-bg)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <I.Alert
        size={16}
        style={{
          color: "var(--v2-neg)",
          marginTop: 2,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{ fontSize: 13, fontWeight: 600, color: "var(--v2-neg)" }}
        >
          {title}
        </div>
        {detail && (
          <div
            style={{
              fontSize: 12,
              color: "var(--v2-ink-muted)",
              marginTop: 2,
              fontFamily: "var(--v2-font-mono)",
            }}
          >
            {detail}
          </div>
        )}
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <I.Refresh size={12} />
          Retry
        </Button>
      )}
    </div>
  );
}
