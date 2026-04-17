"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Suggestion = {
  q: string;
  source: string;
  answer: string;
  metric: string;
  metricLabel: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    q: "What were my top traffic channels last month?",
    source: "GA4",
    answer:
      "Organic search led with 12,847 sessions — up 12% vs the previous month. Paid search was second at 8,234.",
    metric: "24,891",
    metricLabel: "total sessions",
  },
  {
    q: "Compare Google Ads ROAS to LinkedIn last month",
    source: "GOOGLE ADS + LINKEDIN",
    answer:
      "Google Ads returned 4.2× on $12,400 spend. LinkedIn returned 2.1× on $8,200. Google Ads is the stronger channel for direct conversions this period.",
    metric: "4.2×",
    metricLabel: "Google Ads ROAS",
  },
  {
    q: "Which Mailchimp campaign had the best open rate?",
    source: "MAILCHIMP",
    answer:
      "Your Q1 product launch campaign topped the list at 34.2%, 11pp above your list average. Subject line: 12 words.",
    metric: "34.2%",
    metricLabel: "open rate",
  },
];

export function HeroChat() {
  const [input, setInput] = useState("");
  const [active, setActive] = useState<Suggestion | null>(null);
  const [phase, setPhase] = useState<"idle" | "typing" | "answering">("idle");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const reduced = useReducedMotion();

  // Cycle placeholder typing effect when idle
  useEffect(() => {
    if (phase !== "idle" || reduced) return;
    const targetText = SUGGESTIONS[placeholderIndex].q;
    let i = 0;
    setTypedPlaceholder("");

    function type() {
      if (i <= targetText.length) {
        setTypedPlaceholder(targetText.slice(0, i));
        i++;
        typingRef.current = setTimeout(type, 35);
      } else {
        typingRef.current = setTimeout(() => {
          setPlaceholderIndex((p) => (p + 1) % SUGGESTIONS.length);
        }, 1600);
      }
    }

    type();
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [phase, placeholderIndex, reduced]);

  function handleSelect(s: Suggestion) {
    setActive(s);
    setInput(s.q);
    setPhase("typing");
    setTimeout(() => setPhase("answering"), 900);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Any typed question returns the first suggestion as a canned response
    const picked =
      SUGGESTIONS.find((s) =>
        input.toLowerCase().includes(s.q.toLowerCase().split(" ")[2] ?? ""),
      ) ?? SUGGESTIONS[0];
    handleSelect(picked);
  }

  function handleReset() {
    setActive(null);
    setInput("");
    setPhase("idle");
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="hero-chat-input group relative flex items-center gap-3 rounded-2xl px-5 py-4"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[color:var(--brand)]" />
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (active) handleReset();
          }}
          placeholder={phase === "idle" ? typedPlaceholder : ""}
          className="flex-1 bg-transparent text-base text-[color:var(--m-text)] outline-none placeholder:text-[color:var(--m-text-muted)]"
        />
        <button
          type="submit"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
          style={{ background: "var(--m-text)" }}
          aria-label="Ask"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Suggestions */}
      {phase === "idle" && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.q}
              onClick={() => handleSelect(s)}
              className="rounded-full bg-transparent px-4 py-2 text-sm text-[color:var(--m-text-muted)] transition-all hover:border-[color:var(--m-hairline-strong)] hover:text-[color:var(--m-text)]"
              style={{ border: "1px solid var(--m-hairline)" }}
            >
              {s.q}
            </button>
          ))}
        </div>
      )}

      {/* Answer */}
      <AnimatePresence>
        {active && (phase === "typing" || phase === "answering") && (
          <motion.div
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="hairline mt-4 rounded-2xl bg-[color:var(--m-surface-elevated)] p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                  {active.source}
                </span>
                <span className="h-px flex-1 bg-[color:var(--m-hairline)]" />
                <span className="mono text-[10px] text-[color:var(--m-text-muted)]">
                  {phase === "typing" ? "QUERYING…" : "200 OK"}
                </span>
              </div>
              {phase === "typing" ? (
                <div className="flex items-center gap-1.5 py-2">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[color:var(--brand)]"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <p className="mb-5 text-base leading-relaxed text-[color:var(--m-text)]">
                    {active.answer}
                  </p>
                  <div className="hairline-t flex items-baseline justify-between pt-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--m-text-muted)]">
                      {active.metricLabel}
                    </span>
                    <span
                      className="text-3xl text-[color:var(--brand)]"
                      style={{
                        fontFamily: "var(--font-martel), serif",
                        fontWeight: 300,
                      }}
                    >
                      {active.metric}
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="mt-5 text-xs font-medium text-[color:var(--m-text-muted)] transition-colors hover:text-[color:var(--m-text)]"
                  >
                    ← Reset
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
