"use client";

import * as React from "react";
import { I } from "../icons";

interface CreateDashboardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (type: "custom" | "monthly" | "yearly") => void;
  creating?: boolean;
}

const OPTIONS: {
  type: "custom" | "monthly" | "yearly";
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}[] = [
  {
    type: "custom",
    title: "Custom",
    description: "Start with a blank canvas. Add your own widgets.",
    icon: <I.Grid size={20} />,
  },
  {
    type: "monthly",
    title: "Monthly View",
    description: "AI-generated dashboard with month picker. Scorecards, charts, and tables tailored to your connected data.",
    icon: <I.Calendar size={20} />,
    badge: "AI",
  },
  {
    type: "yearly",
    title: "Yearly View",
    description: "AI-generated dashboard with year picker. YTD trends, monthly breakdowns, and annual comparisons.",
    icon: <I.Calendar size={20} />,
    badge: "AI",
  },
];

export function CreateDashboardDialog({
  open,
  onClose,
  onCreate,
  creating = false,
}: CreateDashboardDialogProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={creating ? undefined : onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "color-mix(in oklab, var(--v2-bg) 55%, transparent)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 51,
          width: "min(580px, 92vw)",
          background: "var(--v2-surface)",
          border: "1px solid var(--v2-line)",
          borderRadius: 14,
          boxShadow: "var(--v2-shadow-pop)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px 12px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: "var(--v2-ink)",
              letterSpacing: "-0.01em",
            }}
          >
            Create a dashboard
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: creating ? "not-allowed" : "pointer",
              color: "var(--v2-ink-muted)",
            }}
          >
            <I.X size={14} />
          </button>
        </div>

        {/* Cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "0 20px 20px",
          }}
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              disabled={creating}
              onClick={() => onCreate(opt.type)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "14px 16px",
                background: "var(--v2-surface-2)",
                border: "1px solid var(--v2-line)",
                borderRadius: 10,
                cursor: creating ? "not-allowed" : "pointer",
                textAlign: "left",
                fontFamily: "var(--v2-font-sans)",
                opacity: creating ? 0.6 : 1,
                transition: "border-color 120ms ease, box-shadow 120ms ease",
              }}
              onMouseEnter={(e) => {
                if (!creating) {
                  e.currentTarget.style.borderColor = "var(--v2-brand)";
                  e.currentTarget.style.boxShadow = "0 0 0 1px var(--v2-brand)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--v2-line)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--v2-surface)",
                  border: "1px solid var(--v2-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--v2-ink-muted)",
                  flexShrink: 0,
                }}
              >
                {opt.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--v2-ink)",
                    }}
                  >
                    {opt.title}
                  </span>
                  {opt.badge && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "var(--v2-brand-bg)",
                        color: "var(--v2-brand)",
                      }}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "var(--v2-ink-muted)",
                  }}
                >
                  {opt.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
