"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { I } from "../icons";
import { Btn, IconBtn, ThinkingBlob } from "../primitives";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestedQuestions?: string[];
}

interface DockStage {
  id: string;
  label: string;
  detail?: string;
  status: "active" | "done";
  duration?: number;
}

/**
 * Belt-and-suspenders for the text-only dock: if the model slips through any
 * structured blocks despite the system prompt telling it not to, render as
 * prose by stripping them client-side. Keeps the dock from ever showing
 * `[[insight]]{...}[[/insight]]` as literal JSON text.
 */
function stripStructuredBlocks(text: string): string {
  return text
    .replace(/\[\[insight\]\][\s\S]*?\[\[\/insight\]\]/g, "")
    .replace(/\[\[scorecard\]\][\s\S]*?\[\[\/scorecard\]\]/g, "")
    .replace(/\[\[chart\]\][\s\S]*?\[\[\/chart\]\]/g, "")
    .replace(/\[\[rec\]\][\s\S]*?\[\[\/rec\]\]/g, "")
    // If a block was left unterminated mid-stream, hide everything from the
    // opening [[ so partial JSON never flashes in the dock.
    .replace(/\[\[(insight|scorecard|chart|rec)\]\][\s\S]*$/g, "")
    .trim();
}

interface DashChatDockProps {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  /** Descriptive context for the header, e.g. "4 widgets · Last 7 days" */
  context?: string;
}

/**
 * v2 Chat dock — sits on the right of the dashboard as an absolute overlay.
 * Text-only responses in Phase 1 (inline scorecards/charts come in Phase 2
 * once the chart wrapper is in place).
 */
export function DashChatDock({
  open,
  onClose,
  orgId,
  context,
}: DashChatDockProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toolStatus, setToolStatus] = React.useState<string | null>(null);
  const [stages, setStages] = React.useState<DockStage[]>([]);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus composer when dock opens
  React.useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 200);
  }, [open]);

  async function sendMessage(content: string) {
    if (!orgId) {
      setError("Please select a workspace first.");
      return;
    }
    setError(null);
    setToolStatus(null);
    setStages([]);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          orgId,
          // Dashboard dock is narrow (380px) — no room for charts/tables.
          // Tell the server to constrain the model to prose-only output.
          textOnly: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "Request failed",
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: {
        message?: string;
        suggestedQuestions?: string[];
        error?: string;
      } = {};

      const streamId = crypto.randomUUID();
      const streamMsg: Message = {
        id: streamId,
        role: "assistant",
        content: "",
      };
      setMessages([...updatedMessages, streamMsg]);
      const stageTimers = new Map<string, number>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "status") {
              setToolStatus(event.message);
            } else if (event.type === "stage_start") {
              const id: string = event.id;
              stageTimers.set(id, Date.now());
              setStages((prev) => [
                ...prev,
                {
                  id,
                  label: event.label,
                  detail: event.detail,
                  status: "active",
                },
              ]);
            } else if (event.type === "stage_done") {
              const id: string = event.id;
              const dur =
                typeof event.duration === "number"
                  ? event.duration
                  : stageTimers.get(id)
                    ? (Date.now() - stageTimers.get(id)!) / 1000
                    : undefined;
              stageTimers.delete(id);
              setStages((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, status: "done", duration: dur } : s,
                ),
              );
            } else if (event.type === "text_delta") {
              // Stream text directly into the message so the user can read
              // as it lands. Still stripped for safety when rendered.
              const delta = event.text as string;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamId
                    ? { ...m, content: m.content + delta }
                    : m,
                ),
              );
            } else if (event.type === "result") {
              finalData = event;
              if (finalData.message) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamId
                      ? { ...m, content: finalData.message || "" }
                      : m,
                  ),
                );
              }
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamId
            ? {
                ...m,
                content: finalData.message || m.content || "",
                suggestedQuestions: finalData.suggestedQuestions,
              }
            : m,
        ),
      );
      setToolStatus(null);
      setStages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setToolStatus(null);
      setStages([]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !loading) {
      sendMessage(trimmed);
      setInput("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setError(null);
    setToolStatus(null);
  }

  if (!open) return null;

  return (
    <aside
      role="complementary"
      aria-label="Dashboard chat"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        background: "var(--v2-surface)",
        borderLeft: "1px solid var(--v2-line)",
        boxShadow: "-24px 0 48px -16px rgba(0,0,0,0.35)",
        overflow: "hidden",
        fontFamily: "var(--v2-font-sans)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderBottom: "1px solid var(--v2-line)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "var(--v2-brand-bg)",
            color: "var(--v2-brand)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <I.Sparkle size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--v2-ink)",
            }}
          >
            Ask about this dashboard
          </div>
          {context && (
            <div
              style={{
                fontSize: 11,
                color: "var(--v2-ink-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {context}
            </div>
          )}
        </div>
        {messages.length > 0 && (
          <Btn
            variant="outline"
            size="xs"
            onClick={handleNewChat}
            title="New chat"
            style={{
              borderRadius: 999,
              fontSize: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            New
          </Btn>
        )}
        <IconBtn
          onClick={onClose}
          aria-label="Close chat"
          icon={<I.X size={14} />}
        />
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minHeight: 0,
        }}
      >
        {messages.length === 0 && !loading && (
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--v2-ink-muted)",
              padding: "16px 8px",
              lineHeight: 1.55,
            }}
          >
            Ask plain-English questions about the widgets above —
            trends, drops, comparisons, anomalies.
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
            onSuggestionClick={(q) => sendMessage(q)}
          />
        ))}

        {loading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 11,
                color: "var(--v2-ink-muted)",
                fontFamily: "var(--v2-font-mono)",
              }}
            >
              <ThinkingBlob size={20} />
              <span>{toolStatus || "Thinking…"}</span>
            </div>
            {stages.length > 0 && <CompactStages stages={stages} />}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              background: "var(--v2-neg-bg)",
              fontSize: 12,
              color: "var(--v2-neg)",
              border: "1px solid var(--v2-line)",
            }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        style={{
          borderTop: "1px solid var(--v2-line)",
          padding: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            border: "1.5px solid var(--v2-ink)",
            borderRadius: 10,
            background: "var(--v2-surface)",
            padding: 8,
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up…"
            disabled={loading}
            rows={1}
            className="no-focus-ring"
            style={{
              width: "100%",
              resize: "none",
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--v2-ink)",
              fontFamily: "var(--v2-font-sans)",
              maxHeight: 120,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                color: "var(--v2-ink-subtle)",
              }}
            >
              {context
                ? `Answers draw from ${context.toLowerCase()}.`
                : "Answers draw from this dashboard."}
            </span>
            <IconBtn
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || !input.trim()}
              aria-label="Send"
              icon={<I.ArrowUp size={14} />}
            />
          </div>
        </div>
      </form>
    </aside>
  );
}

/**
 * Compact list of tool-call stages for the narrow dock — each stage is one
 * line with a small indicator dot, label, and (on completion) a duration.
 * Mirrors the main chat's Stages component but shrunk for a 380px column.
 */
function CompactStages({ stages }: { stages: DockStage[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 10px",
        border: "1px solid var(--v2-line)",
        borderRadius: 8,
        background: "var(--v2-surface-2)",
      }}
    >
      {stages.map((s) => (
        <div
          key={s.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color:
              s.status === "active"
                ? "var(--v2-ink)"
                : "var(--v2-ink-muted)",
            fontFamily: "var(--v2-font-sans)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {s.status === "active" ? (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: "var(--v2-brand-vivid)",
                  animation: "meaningPulseDot 1.4s ease-out infinite",
                }}
              />
            ) : (
              <I.Check size={10} style={{ color: "var(--v2-ink-muted)" }} />
            )}
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={s.detail || s.label}
          >
            {s.label}
          </span>
          {s.status === "done" && typeof s.duration === "number" && (
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--v2-ink-subtle)",
                flexShrink: 0,
              }}
            >
              {s.duration.toFixed(1)}s
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
  onSuggestionClick,
}: {
  message: Message;
  isLast: boolean;
  onSuggestionClick: (q: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "88%" }}>
        <div
          style={{
            background: "var(--v2-ink)",
            color: "var(--v2-ink-inverse)",
            padding: "9px 13px",
            borderRadius: "12px 12px 3px 12px",
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "92%" }}>
      <div
        className="prose-chat"
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--v2-ink)",
        }}
      >
        {message.content ? (
          <ReactMarkdown
            components={{
              // Belt-and-suspenders: if the model still emits a markdown table
              // despite the system prompt, render it as a plain paragraph so
              // the narrow dock doesn't overflow horizontally.
              table: ({ children }) => <div>{children}</div>,
              thead: ({ children }) => <div>{children}</div>,
              tbody: ({ children }) => <div>{children}</div>,
              tr: ({ children }) => (
                <div style={{ display: "block" }}>{children}</div>
              ),
              th: ({ children }) => (
                <span style={{ fontWeight: 600, marginRight: 8 }}>
                  {children}
                </span>
              ),
              td: ({ children }) => (
                <span style={{ marginRight: 8 }}>{children}</span>
              ),
            }}
          >
            {stripStructuredBlocks(message.content)}
          </ReactMarkdown>
        ) : (
          <span className="caret" />
        )}
      </div>

      {isLast &&
        message.suggestedQuestions &&
        message.suggestedQuestions.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="kicker" style={{ marginBottom: 6 }}>
              Follow-ups
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              {message.suggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onSuggestionClick(q)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 11px",
                    background: "transparent",
                    border: "1px solid var(--v2-line)",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "var(--v2-ink)",
                    fontSize: 12.5,
                    textAlign: "left",
                    fontFamily: "var(--v2-font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--v2-surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ flex: 1 }}>{q}</span>
                  <I.ChevronR
                    size={11}
                    style={{ color: "var(--v2-ink-subtle)" }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
