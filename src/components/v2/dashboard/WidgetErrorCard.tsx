"use client";

import * as React from "react";
import { I } from "../icons";
import { Btn, IconBtn } from "../primitives";

interface WidgetErrorCardProps {
  title: string;
  error: string;
  onReconnect?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
}

/**
 * Inline widget error state — replaces the chart body when the most recent
 * refresh failed. Mirrors the design spec's "Microsoft Ads token expired"
 * card: red-tinted alert icon, title, short description, Reconnect CTA.
 *
 * The error string from the refresh API is technical (SQL/auth errors). We
 * surface it verbatim under the title so a user diagnosing the problem has
 * what they need, but the primary action stays Reconnect.
 */
export function WidgetErrorCard({
  title,
  error,
  onReconnect,
  onRemove,
  onRetry,
}: WidgetErrorCardProps) {
  const looksLikeAuthError =
    /token|disconnect|reconnect|unauthor|401|403|expired|revoked/i.test(
      error,
    );

  return (
    <section
      className="widget-shell"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--v2-surface)",
        border: "1px solid var(--v2-line)",
        borderRadius: 10,
        overflow: "hidden",
        fontFamily: "var(--v2-font-sans)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px 10px",
          minHeight: 52,
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
        {onRemove && (
          <IconBtn
            onClick={onRemove}
            title="Remove widget"
            className="widget-kebab"
            icon={<I.X size={13} />}
          />
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--v2-line)" }} />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: 16,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--v2-neg-bg)",
            color: "var(--v2-neg)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <I.Alert size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--v2-ink)",
              marginBottom: 3,
            }}
          >
            {looksLikeAuthError
              ? "Source disconnected"
              : "Widget couldn't load"}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--v2-ink-muted)",
              lineHeight: 1.5,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
            title={error}
          >
            {error}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {onRetry && (
            <Btn
              variant="ghost"
              size="sm"
              icon={<I.Refresh size={12} />}
              onClick={onRetry}
            >
              Retry
            </Btn>
          )}
          {onReconnect && looksLikeAuthError && (
            <Btn
              variant="outline"
              size="sm"
              icon={<I.Plug size={12} />}
              onClick={onReconnect}
            >
              Reconnect
            </Btn>
          )}
        </div>
      </div>
    </section>
  );
}
