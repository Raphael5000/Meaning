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
  MAILCHIMP: "",
};

export default function ChatInput({ onSend, disabled, placeholder, dataSources }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (!sourcesOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
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
  const hasDataSources = activeSources.length > 0;

  return (
    <div className="flex w-full justify-center px-4 pb-4 pt-2">
      <div className="relative w-full max-w-3xl" ref={panelRef}>
        {/* Popover — opens upward from trigger */}
        {sourcesOpen && hasDataSources && (
          <div
            className="absolute bottom-8 left-0 z-10 w-52 overflow-hidden rounded-lg border border-border bg-popover py-1.5 shadow-lg animate-in fade-in-0 slide-in-from-bottom-1 duration-100"
            style={{ borderColor: "var(--border-color)" }}
          >
            {activeSources.map((ds, i) => (
              <div
                key={`${ds.type}-${i}`}
                className="flex items-center gap-2.5 px-3 py-1.5"
              >
                {SOURCE_ICONS[ds.type] ? (
                  <img src={SOURCE_ICONS[ds.type]} alt="" className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded text-[8px] font-bold" style={{ background: "#ffe01b", color: "#241c15" }}>M</span>
                )}
                <span className="text-[13px] text-popover-foreground">{ds.label}</span>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="relative flex w-full items-end rounded-2xl border border-border bg-muted"
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
          <Button
            type="submit"
            disabled={disabled || !input.trim()}
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full"
            style={{
              background: input.trim()
                ? "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)"
                : "transparent",
              color: input.trim() ? "#ffffff" : "var(--text-muted)",
            }}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </form>

        {/* Trigger */}
        {hasDataSources && (
          <button
            type="button"
            onClick={() => setSourcesOpen((o) => !o)}
            className="mt-1 flex cursor-pointer items-center gap-1 px-1 py-0.5 text-[11px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          >
            <Database className="h-3 w-3" />
            <span>Data sources</span>
            <ChevronDown
              className="h-2.5 w-2.5 transition-transform duration-100"
              style={{ transform: sourcesOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
