"use client";

import * as React from "react";
import { I } from "../icons";
import { IconBtn } from "../primitives";

type Phase = "submitted" | "streaming";

interface InflightWidgetProps {
  title: string;
  /** When was the generation request sent. Defaults to mount time. */
  startedAt?: number;
  onCancel?: () => void;
}

/**
 * 3-phase widget-generation indicator, per the design spec:
 *   - Submitted  (0 - ~1.2s): placeholder bars shimmer, "Interpreting prompt"
 *   - Streaming  (1.2s - resolve): bars draw in left-to-right, scan-line
 *     sweeps across the top, status shows the tool call in progress.
 *   - Complete   is handled by the parent: when the real widget swaps in,
 *     this component unmounts and the final chart renders. The optional
 *     "Just added" chip is left to the parent because it lives on the
 *     post-swap widget, not on this placeholder.
 *
 * Phase transitions are time-based — the widget-generation endpoint is a
 * single JSON response (no SSE progress), so client-side timing is the
 * best proxy for "we've moved past prompt parsing and into the tool call".
 */
export function InflightWidget({
  title,
  startedAt,
  onCancel,
}: InflightWidgetProps) {
  const mountedAt = React.useRef(startedAt ?? Date.now());
  const [elapsedMs, setElapsedMs] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - mountedAt.current);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  const phase: Phase = elapsedMs < 1200 ? "submitted" : "streaming";
  const elapsed = (elapsedMs / 1000).toFixed(1) + "s";
  const action =
    phase === "submitted"
      ? "Interpreting prompt"
      : "Querying sources — building chart";

  return (
    <section
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--v2-surface)",
        border: "1px solid var(--v2-ink)",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklab, var(--v2-brand-vivid) 20%, transparent)",
        fontFamily: "var(--v2-font-sans)",
        transition:
          "border-color 200ms var(--v2-ease), box-shadow 200ms var(--v2-ease)",
      }}
    >
      {phase === "streaming" && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            overflow: "hidden",
            background:
              "color-mix(in oklab, var(--v2-brand-vivid) 18%, transparent)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: "40%",
              height: "100%",
              background: "var(--v2-brand-vivid)",
              animation: "meaningScan 1.4s linear infinite",
              boxShadow: "0 0 10px 0 var(--v2-brand-vivid)",
            }}
          />
        </div>
      )}

      {/* Status strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          borderBottom: "1px solid var(--v2-line)",
          background:
            "color-mix(in oklab, var(--v2-brand-vivid) 4%, var(--v2-surface))",
        }}
      >
        <span
          style={{
            position: "relative",
            width: 10,
            height: 10,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              background: "var(--v2-brand-vivid)",
              animation: "meaningPulseDot 1.4s ease-out infinite",
            }}
          />
          <span
            style={{
              position: "absolute",
              inset: 2.5,
              borderRadius: 999,
              background: "var(--v2-brand-vivid)",
            }}
          />
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 11.5,
            color: "var(--v2-ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {action}
        </span>
        <span
          className="mono"
          style={{ fontSize: 10.5, color: "var(--v2-ink-muted)" }}
        >
          {elapsed}
        </span>
        {onCancel && (
          <IconBtn
            size="xs"
            onClick={onCancel}
            title="Cancel"
            icon={<I.X size={11} />}
          />
        )}
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px 10px",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--v2-ink)",
            letterSpacing: "-0.005em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--v2-line)" }} />

      {/* Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: 16,
          position: "relative",
        }}
      >
        {phase === "submitted" ? <SubmittedBody /> : <StreamingBody />}
      </div>
    </section>
  );
}

/** Empty axes + shimmer bars — waiting for data. */
function SubmittedBody() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          height: "70%",
        }}
      >
        {[38, 52, 44, 66, 48, 72, 58, 80, 62, 88, 70, 96].map((h, i) => (
          <div
            key={i}
            className="shimmer"
            style={{
              flex: 1,
              height: `${h}%`,
              background: "var(--v2-surface-2)",
              borderRadius: 2,
              animationDelay: `${i * 0.06}s`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--v2-line)",
          margin: "0 -2px",
        }}
      />
    </div>
  );
}

/**
 * Bars drawing in left-to-right during streaming. Each bar animates to full
 * height with a staggered delay so the chart "grows". Scan-line at the top
 * conveys the active streaming state globally.
 */
function StreamingBody() {
  const heights = [28, 36, 42, 52, 48, 60, 58, 72, 66, 82, 74, 90];
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        justifyContent: "flex-end",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          height: "70%",
        }}
      >
        {heights.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: "var(--v2-c-1)",
              borderRadius: 2,
              animation: `inflight-bar-rise 420ms var(--v2-ease) ${i * 80}ms both`,
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--v2-line)",
          margin: "0 -2px",
        }}
      />
      <style>{`
        @keyframes inflight-bar-rise {
          from { transform: scaleY(0); opacity: 0; }
          to   { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
