"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface EmailTagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailTagInput({ value, onChange, placeholder = "email@example.com", className }: EmailTagInputProps) {
  const emails = value ? value.split(",").map((e) => e.trim()).filter(Boolean) : [];
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addEmail(raw: string) {
    const email = raw.trim().replace(/,$/,"");
    if (!email || !EMAIL_REGEX.test(email)) return;
    if (emails.includes(email)) return;
    const updated = [...emails, email];
    onChange(updated.join(", "));
    setInputValue("");
  }

  function removeEmail(index: number) {
    const updated = emails.filter((_, i) => i !== index);
    onChange(updated.join(", "));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " " || e.key === "Tab") {
      if (inputValue.trim()) {
        e.preventDefault();
        addEmail(inputValue);
      }
    }
    if (e.key === "Backspace" && !inputValue && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const parts = pasted.split(/[,;\s]+/).filter(Boolean);
    const valid = parts.filter((p) => EMAIL_REGEX.test(p.trim()));
    if (valid.length > 0) {
      const updated = [...new Set([...emails, ...valid.map((v) => v.trim())])];
      onChange(updated.join(", "));
      setInputValue("");
    }
  }

  function handleBlur() {
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
  }

  return (
    <div
      className={`flex h-8 flex-wrap items-center gap-1 overflow-hidden rounded-md border border-input bg-background px-1.5 text-xs focus-within:ring-1 focus-within:ring-ring ${className || ""}`}
      onClick={() => inputRef.current?.focus()}
    >
      {emails.map((email, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 rounded px-1.5 text-[11px] leading-5"
          style={{
            background: "var(--bg-tertiary, rgba(255,255,255,0.08))",
            border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
            color: "var(--text-primary, inherit)",
          }}
        >
          {email}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeEmail(i); }}
            className="rounded-sm p-0 opacity-50 transition-opacity hover:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={emails.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
