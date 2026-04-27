"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn } from "../primitives";
import { EmailTagInput } from "@/components/ui/email-tag-input";

interface RecipientsPillProps {
  /** Comma-separated email string (DB shape — same as v1) */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Inline "To" pill — collapsed shows a comma-separated summary + count.
 * Click to expand into the full EmailTagInput. Matches the SchedulePill chrome.
 */
export function RecipientsPill({ value, onChange }: RecipientsPillProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const emails = value
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const count = emails.length;
  const summary =
    count === 0
      ? "Add recipients…"
      : emails.slice(0, 3).join(", ") + (count > 3 ? `, +${count - 3}` : "");

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 12,
          background: "var(--v2-surface)",
          border: "1px solid var(--v2-line)",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--v2-font-sans)",
          transition:
            "background 120ms var(--v2-ease), border-color 120ms var(--v2-ease)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--v2-surface-2)";
          e.currentTarget.style.borderColor = "var(--v2-line-strong)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--v2-surface)";
          e.currentTarget.style.borderColor = "var(--v2-line)";
        }}
      >
        <span style={{ color: "var(--v2-ink-muted)", display: "inline-flex" }}>
          <I.Users size={14} />
        </span>
        <span
          style={{
            fontSize: 11.5,
            color: "var(--v2-ink-muted)",
            minWidth: 28,
          }}
        >
          To
        </span>
        <span
          style={{
            flex: 1,
            fontSize: 13.5,
            color: count === 0 ? "var(--v2-ink-muted)" : "var(--v2-ink)",
            fontWeight: count === 0 ? 400 : 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "var(--v2-font-mono)",
          }}
        >
          {summary}
        </span>
        {count > 0 && (
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--v2-ink-muted)" }}
          >
            {count} recipient{count === 1 ? "" : "s"}
          </span>
        )}
        <I.Edit
          size={12}
          style={{ color: "var(--v2-ink-subtle)", flexShrink: 0 }}
        />
      </button>

      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "var(--v2-surface)",
            border: "1px solid var(--v2-line)",
            borderRadius: 14,
            boxShadow: "var(--v2-shadow-pop)",
            padding: 16,
            fontFamily: "var(--v2-font-sans)",
          }}
        >
          <div
            className="kicker"
            style={{ marginBottom: 10 }}
          >
            Recipients
          </div>
          <div className="meaning-v2-tag-input">
            <EmailTagInput
              value={value}
              onChange={onChange}
              placeholder="Add an email…"
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--v2-ink-subtle)",
                fontFamily: "var(--v2-font-mono)",
              }}
            >
              Press Enter or comma to add
            </span>
            <Btn variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Done
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
