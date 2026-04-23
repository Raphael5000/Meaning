"use client";

import * as React from "react";
import { I } from "./icons";
import { ThinkingBlob } from "./primitives";
import { Button } from "./ui/button";

/* =============================================================
   THINKING (lightweight — kicker + optional status text)
   ============================================================= */

export function Thinking({ status }: { status?: string | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[780px] py-3">
      <div
        className="absolute top-3 hidden md:block"
        style={{ right: "calc(100% + 8px)" }}
      >
        <ThinkingBlob size={20} />
      </div>
      <div className="flex items-center gap-3 md:block">
        <span className="md:hidden">
          <ThinkingBlob size={20} />
        </span>
        {status ? (
          <span className="text-[12px] text-v2-ink-muted">{status}</span>
        ) : (
          <span className="text-[12px] text-v2-ink-muted">Thinking…</span>
        )}
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
