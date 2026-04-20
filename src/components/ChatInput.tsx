"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Database, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataSourceInfo {
  type: string;
  status: string;
  label: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
  dataSources?: DataSourceInfo[];
}

const SOURCE_ICONS: Record<string, string> = {
  GA4_BIGQUERY: "/Google Analytics.svg",
  GOOGLE_ADS: "/Google Ads.svg",
  LINKEDIN: "/Linkedin.svg",
  SEARCH_CONSOLE: "/Search Console.svg",
  MAILCHIMP: "/Mailchimp.svg",
  MICROSOFT_ADS: "/Microsoft Ads.svg",
};

const SOURCE_FALLBACK: Record<string, { bg: string; color: string; letter: string }> = {};

export default function ChatInput({ onSend, disabled, placeholder, dataSources }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Close popover on outside click
  useEffect(() => {
    if (!sourcesOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [sourcesOpen]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const activeSources = dataSources?.filter((ds) => ds.status === "ACTIVE") ?? [];

  return (
    <div className="flex w-full justify-center px-4 pb-4 pt-2">
      <form
        ref={containerRef}
        onSubmit={handleSubmit}
        className="relative w-full max-w-3xl rounded-2xl border border-border bg-muted"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Ask about your analytics..."}
          disabled={disabled}
          rows={1}
          className="max-h-[200px] w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />

        {/* Sources row inside the input */}
        {activeSources.length > 0 && (
          <div className="relative flex items-center px-3 pb-2.5">
            <button
              type="button"
              onClick={() => setSourcesOpen((o) => !o)}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              style={{ background: "var(--bg-tertiary, rgba(128,128,128,0.08))" }}
            >
              <Database className="h-3 w-3" />
              <span>{activeSources.length} source{activeSources.length !== 1 ? "s" : ""}</span>
              <ChevronDown
                className="h-2.5 w-2.5 transition-transform duration-150"
                style={{ transform: sourcesOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>

            {/* Popover — opens upward */}
            {sourcesOpen && (
              <div
                className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-xl border py-2 shadow-xl"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border-color)" }}
              >
                {activeSources.map((ds, i) => {
                  const icon = SOURCE_ICONS[ds.type];
                  const fallback = SOURCE_FALLBACK[ds.type];
                  return (
                    <div
                      key={`${ds.type}-${i}`}
                      className="flex items-center gap-2.5 px-3 py-1.5"
                    >
                      {icon ? (
                        <img src={icon} alt="" className="h-3.5 w-3.5 shrink-0" />
                      ) : fallback ? (
                        <span
                          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[7px] font-bold"
                          style={{ background: fallback.bg, color: fallback.color }}
                        >
                          {fallback.letter}
                        </span>
                      ) : (
                        <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-xs text-foreground">{ds.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={disabled || !input.trim()}
          size="icon"
          className="absolute right-2 h-8 w-8 rounded-full"
          style={{
            background: input.trim()
              ? "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)"
              : "transparent",
            color: input.trim() ? "#ffffff" : "var(--text-muted)",
            bottom: activeSources.length > 0 ? "0.625rem" : "0.5rem",
          }}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
