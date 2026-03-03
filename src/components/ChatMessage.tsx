"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  scorecard?: { value: string; label: string; change?: string };
  /** When true, show full content immediately (e.g. after returning to chat) */
  scorecardRevealed?: boolean;
  suggestedQuestions?: string[];
  onSuggestedQuestionClick?: (question: string) => void;
  /** Called once when the typewriter finishes (so parent can persist and avoid re-streaming) */
  onTypewriterComplete?: () => void;
}

const TYPEWRITER_WORD_DELAY_MS = 25;
const TYPEWRITER_INITIAL_DELAY_MS = 400;

export default function ChatMessage({
  role,
  content,
  scorecard,
  scorecardRevealed,
  suggestedQuestions,
  onSuggestedQuestionClick,
  onTypewriterComplete,
}: ChatMessageProps) {
  const isUser = role === "user";
  const shouldStream =
    role === "assistant" &&
    scorecard &&
    content.length > 0 &&
    !scorecardRevealed;
  const useTypewriter = shouldStream;

  const parts = useMemo(
    () => content.split(/(\s+)/),
    [content]
  );
  const [visiblePartCount, setVisiblePartCount] = useState(() =>
    useTypewriter ? 0 : parts.length
  );
  const completedRef = useRef(false);

  useEffect(() => {
    if (!useTypewriter || visiblePartCount >= parts.length) return;
    const initial = setTimeout(() => {
      setVisiblePartCount((n) => Math.min(n + 1, parts.length));
    }, TYPEWRITER_INITIAL_DELAY_MS);
    return () => clearTimeout(initial);
  }, [useTypewriter, parts.length, visiblePartCount]);

  useEffect(() => {
    if (!useTypewriter || visiblePartCount <= 0 || visiblePartCount >= parts.length) return;
    const t = setInterval(() => {
      setVisiblePartCount((n) => Math.min(n + 1, parts.length));
    }, TYPEWRITER_WORD_DELAY_MS);
    return () => clearInterval(t);
  }, [useTypewriter, visiblePartCount, parts.length]);

  useEffect(() => {
    if (
      !useTypewriter ||
      visiblePartCount < parts.length ||
      parts.length === 0 ||
      completedRef.current
    )
      return;
    completedRef.current = true;
    onTypewriterComplete?.();
  }, [useTypewriter, visiblePartCount, parts.length, onTypewriterComplete]);

  const visibleContent = useTypewriter
    ? parts.slice(0, visiblePartCount).join("")
    : content;

  return (
    <div className="flex w-full justify-center px-4 py-6">
      <div
        className={`flex w-full max-w-3xl ${isUser ? "justify-end" : ""}`}
      >
        {/* Message bubble */}
        <div
          className={
            isUser
              ? "flex min-w-0 max-w-[85%] justify-end"
              : "min-w-0 flex-1"
          }
        >
          {role === "assistant" && scorecard && (
            <div
              className="scorecard mb-3 inline-flex w-fit flex-col gap-0 rounded-2xl border border-border bg-secondary px-4 py-3"
            >
              <div className="flex items-baseline gap-3">
                <div className="flex flex-col items-baseline gap-0 text-3xl leading-[1.2]">
                  <span className="font-semibold tabular-nums tracking-tight text-foreground">
                    {scorecard.value}
                  </span>
                  {scorecard.change && (
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: "0.5em",
                        color: scorecard.change.startsWith("-")
                          ? "var(--error)"
                          : "var(--success)",
                      }}
                    >
                      {scorecard.change.startsWith("-") ? (
                        <>&darr; {scorecard.change}</>
                      ) : (
                        <>&uarr; {scorecard.change.startsWith("+") ? scorecard.change : `+${scorecard.change}`}</>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {scorecard.label}
                </span>
              </div>
            </div>
          )}
          <div
            className={`message-content rounded-2xl px-4 py-1 text-sm leading-relaxed ${
              isUser ? "max-w-full" : ""
            }`}
            style={{
              color: "var(--text-primary)",
              background: isUser
                ? "var(--user-bubble)"
                : "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              ...(isUser && { display: "inline-block", width: "fit-content", maxWidth: "100%" }),
            }}
            dangerouslySetInnerHTML={{ __html: formatContent(visibleContent) }}
          />
          {role === "assistant" &&
            suggestedQuestions &&
            suggestedQuestions.length > 0 &&
            onSuggestedQuestionClick && (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestedQuestions.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    className="rounded-full text-left whitespace-normal h-auto"
                    onClick={() => onSuggestedQuestionClick(q)}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

const REC_BLOCK_REGEX = /\[\[rec\]\]([\s\S]*?)\[\[\/rec\]\]/g;

function formatContent(text: string): string {
  // Extract recommendation blocks first and replace with placeholders
  const recBlocks: string[] = [];
  let html = text.replace(REC_BLOCK_REGEX, (_, content) => {
    recBlocks.push(content.trim());
    return `___REC_BLOCK_${recBlocks.length - 1}___`;
  });

  // Basic markdown-like formatting
  html = escapeHtml(html);

  // Code blocks (```...```)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre><code class="language-$1">$2</code></pre>'
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Tables
  html = formatTables(html);

  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  // Single newlines within paragraphs
  html = html.replace(/\n/g, "<br>");

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p>(<h[1-3]>)/g, "$1");
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, "$1");
  html = html.replace(/<p>(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)<\/p>/g, "$1");
  html = html.replace(/<p>(<pre>)/g, "$1");
  html = html.replace(/(<\/pre>)<\/p>/g, "$1");
  html = html.replace(/<p>(<table>)/g, "$1");
  html = html.replace(/(<\/table>)<\/p>/g, "$1");
  html = html.replace(/<p>(<blockquote>)/g, "$1");
  html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");

  // Unwrap rec placeholders from <p> tags (block in inline is invalid)
  recBlocks.forEach((_, i) => {
    html = html.replace(
      new RegExp(`<p>___REC_BLOCK_${i}___<\\/p>`, "g"),
      `___REC_BLOCK_${i}___`
    );
  });

  // Replace recommendation block placeholders with green bubbles
  recBlocks.forEach((content, i) => {
    const formatted = formatContentInner(content);
    const bubble = `<div class="rec-bubble">${REC_TICK_SVG}<div class="rec-bubble-content">${formatted}</div></div>`;
    html = html.replace(`___REC_BLOCK_${i}___`, bubble);
  });

  return html;
}

/** Format content without processing [[rec]] blocks (avoids recursion) */
function formatContentInner(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/\n/g, "<br>");
  html = html.replace(/<p><\/p>/g, "");
  return html;
}

const REC_TICK_SVG =
  '<svg class="rec-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTables(html: string): string {
  // Match markdown tables
  const tableRegex = /(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/g;

  return html.replace(tableRegex, (_, headerRow: string, _separator: string, bodyRows: string) => {
    const headers = headerRow
      .split("|")
      .filter((c: string) => c.trim())
      .map((c: string) => `<th>${c.trim()}</th>`)
      .join("");

    const rows = bodyRows
      .trim()
      .split("\n")
      .map((row: string) => {
        const cells = row
          .split("|")
          .filter((c: string) => c.trim())
          .map((c: string) => `<td>${c.trim()}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });
}
