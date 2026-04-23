"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChartRenderer, { type ChartRendererHandle, extractPieData, extractBarLegendData, getPieMetricLabel, ACCENT_PALETTE } from "./ChartRenderer";
import ChartShareMenu from "./ChartShareMenu";

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
  /** ECharts option JSON for inline charts */
  chart?: Record<string, unknown>;
  /** When true, hide charts (used in narrow sidebars where charts don't fit) */
  compact?: boolean;
}

const TYPEWRITER_WORD_DELAY_MS = 25;
const TYPEWRITER_INITIAL_DELAY_MS = 400;

const REC_BLOCK_REGEX = /\[\[rec\]\]([\s\S]*?)\[\[\/rec\]\]/g;

type ContentSegment =
  | { kind: "markdown"; text: string }
  | { kind: "rec"; text: string };

function splitContent(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(REC_BLOCK_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ kind: "markdown", text: text.slice(lastIndex, start) });
    }
    segments.push({ kind: "rec", text: match[1].trim() });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: "markdown", text: text.slice(lastIndex) });
  }
  return segments;
}

function Markdown({ text }: { text: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
}

function RecommendationCallout({ text }: { text: string }) {
  return (
    <div className="rec-bubble">
      <Sparkles className="rec-tick" aria-hidden />
      <div className="rec-bubble-content">
        <Markdown text={text} />
      </div>
    </div>
  );
}

export default function ChatMessage({
  role,
  content,
  scorecard,
  scorecardRevealed,
  suggestedQuestions,
  onSuggestedQuestionClick,
  onTypewriterComplete,
  chart,
  compact,
}: ChatMessageProps) {
  const chartRef = useRef<ChartRendererHandle>(null);
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

  const segments = useMemo(() => splitContent(visibleContent), [visibleContent]);

  // Compute legend data for chart image export
  const chartLegendData = useMemo(() => {
    if (!chart) return null;
    return extractPieData(chart, ACCENT_PALETTE) || extractBarLegendData(chart, ACCENT_PALETTE);
  }, [chart]);
  const chartMetricLabel = useMemo(() => {
    if (!chart) return undefined;
    return getPieMetricLabel(chart);
  }, [chart]);

  return (
    <div className="flex w-full justify-center px-4 py-6">
      <div
        className={`flex w-full max-w-3xl ${isUser ? "justify-end" : ""}`}
      >
        <div
          className={
            isUser
              ? "flex min-w-0 max-w-[85%] justify-end"
              : "min-w-0 flex-1"
          }
        >
          {role === "assistant" && scorecard && (
            <div className="scorecard mb-3 inline-flex w-fit flex-col gap-0 rounded-2xl border border-border bg-secondary px-4 py-3">
              <div className="flex items-baseline gap-3">
                <div className="flex flex-col items-baseline gap-0 text-3xl leading-[1.2]">
                  <span className="font-semibold tabular-nums tracking-tight text-foreground">
                    {scorecard.value}
                  </span>
                  {scorecard.change && (
                    <span
                      className={`tabular-nums text-[0.5em] ${
                        scorecard.change.startsWith("-")
                          ? "text-destructive"
                          : "text-success"
                      }`}
                    >
                      {scorecard.change.startsWith("-") ? (
                        <>&darr; {scorecard.change}</>
                      ) : (
                        <>&uarr; {scorecard.change.startsWith("+") ? scorecard.change : `+${scorecard.change}`}</>
                      )}
                    </span>
                  )}
                </div>
                <span className="text-sm text-soft">
                  {scorecard.label}
                </span>
              </div>
            </div>
          )}
          {role === "assistant" && chart && !compact && (
            <div className="relative mb-3 overflow-hidden rounded-2xl border border-border bg-secondary p-4">
              <div className="absolute right-3 top-3 z-10">
                <ChartShareMenu
                  getDataURL={() => chartRef.current?.getDataURL() ?? null}
                  legendData={chartLegendData}
                  legendMetricLabel={chartMetricLabel}
                />
              </div>
              <ChartRenderer ref={chartRef} option={chart} />
            </div>
          )}
          <div
            className={`message-content rounded-2xl border border-border px-4 py-1 text-sm leading-relaxed text-foreground ${
              isUser
                ? "inline-block w-fit max-w-full bg-user-bubble"
                : "bg-secondary"
            }`}
          >
            {segments.map((seg, i) =>
              seg.kind === "rec" ? (
                <RecommendationCallout key={i} text={seg.text} />
              ) : (
                <Markdown key={i} text={seg.text} />
              )
            )}
          </div>
          {role === "assistant" &&
            suggestedQuestions &&
            suggestedQuestions.length > 0 &&
            onSuggestedQuestionClick && (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestedQuestions.map((q) => (
                  <Button
                    key={q}
                    variant="outline"
                    className="rounded-full text-left whitespace-normal h-auto text-soft"
                    onClick={() => onSuggestedQuestionClick(q)}
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
