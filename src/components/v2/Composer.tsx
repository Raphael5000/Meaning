"use client";

import * as React from "react";
import { I } from "./icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";

interface SourceInfo {
  type: string;
  label: string;
}

const SOURCE_ICONS: Record<string, string> = {
  GA4_BIGQUERY: "/Google Analytics.svg",
  GOOGLE_ADS: "/Google Ads.svg",
  LINKEDIN: "/Linkedin.svg",
  SEARCH_CONSOLE: "/Search Console.svg",
  MAILCHIMP: "/Mailchimp.svg",
  MICROSOFT_ADS: "/Microsoft Ads.svg",
  AHREFS: "/Ahrefs.svg",
  ATTIO: "/Attio.svg",
  HUBSPOT: "/HubSpot.svg",
  REDDIT: "/Reddit.svg",
};

interface ComposerProps {
  disabled?: boolean;
  streaming?: boolean;
  sources?: SourceInfo[];
  onSend?: (value: string) => void;
  onStop?: () => void;
}

export function Composer({
  disabled,
  streaming,
  sources = [],
  onSend,
  onStop,
}: ComposerProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [value]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend?.(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const hasValue = value.trim().length > 0;
  const showStop = streaming === true;

  return (
    <div className="mx-auto w-full max-w-[780px] pb-5 pt-2">
      <form
        onSubmit={submit}
        className="rounded-[14px] border border-v2-line-strong bg-v2-surface px-3.5 pt-3 pb-2 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.2)] transition-colors focus-within:border-v2-ink"
      >
        <textarea
          ref={textareaRef}
          value={value}
          placeholder="Ask about your analytics…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled && !streaming}
          className="no-focus-ring w-full max-h-[200px] resize-none border-none bg-transparent px-1 pt-1 pb-2 text-[14px] leading-6 text-v2-ink outline-none placeholder:text-v2-ink-muted disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {sources.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md bg-v2-surface-2 border border-v2-line px-2 py-1 text-[11px] text-v2-ink-muted transition-colors hover:border-v2-line-strong hover:text-v2-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink data-[state=open]:border-v2-line-strong data-[state=open]:text-v2-ink"
                  >
                    <I.Db size={11} />
                    <span className="mono">
                      {sources.length} source{sources.length !== 1 ? "s" : ""}
                    </span>
                    <I.Chevron size={11} />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" side="top" className="w-[240px] p-0">
                  <div className="py-2">
                    <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-v2-ink-muted">
                      Connected sources
                    </div>
                    {sources.map((s) => {
                      const icon = SOURCE_ICONS[s.type];
                      return (
                        <div
                          key={s.type}
                          className="flex items-center gap-2.5 px-3 py-1.5 text-[12.5px] text-v2-ink"
                        >
                          {icon ? (
                            <img
                              src={icon}
                              alt=""
                              className="h-3.5 w-3.5 shrink-0"
                            />
                          ) : (
                            <I.Db
                              size={12}
                              className="shrink-0 text-v2-ink-muted"
                            />
                          )}
                          <span className="truncate">{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type={showStop ? "button" : "submit"}
              onClick={showStop ? onStop : undefined}
              disabled={!showStop && !hasValue}
              aria-label={showStop ? "Stop generating" : "Send message"}
              className={`flex h-[30px] w-[30px] items-center justify-center rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink ${
                hasValue || showStop
                  ? "bg-v2-ink text-v2-ink-inverse hover:opacity-90 active:opacity-80"
                  : "cursor-not-allowed border border-v2-line bg-v2-surface-2 text-v2-ink-subtle"
              }`}
            >
              {showStop ? <I.Stop size={12} /> : <I.ArrowUp size={14} />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
