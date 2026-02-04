"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

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

  return (
    <div className="flex w-full justify-center px-4 pb-4 pt-2">
      <form
        onSubmit={handleSubmit}
        className="relative flex w-full max-w-3xl items-end rounded-2xl"
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your analytics..."
          disabled={disabled}
          rows={1}
          className="max-h-[200px] w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm outline-none placeholder:text-[var(--text-muted)]"
          style={{ color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="absolute bottom-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-[100px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          style={{
            background: input.trim()
              ? "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)"
              : "transparent",
            color: "white",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </form>
    </div>
  );
}
