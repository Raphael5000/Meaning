"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        className="relative flex w-full max-w-3xl items-end rounded-2xl border border-border bg-muted"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your analytics..."
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
    </div>
  );
}
