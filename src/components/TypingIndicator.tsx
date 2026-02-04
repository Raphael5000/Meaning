"use client";

export default function TypingIndicator() {
  return (
    <div className="flex w-full justify-center px-4 py-6">
      <div className="flex w-full max-w-3xl gap-4">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--accent)" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
        </div>
        <div className="flex items-center gap-1 pt-2">
          <div
            className="typing-dot h-2 w-2 rounded-full"
            style={{ background: "var(--text-muted)" }}
          />
          <div
            className="typing-dot h-2 w-2 rounded-full"
            style={{ background: "var(--text-muted)" }}
          />
          <div
            className="typing-dot h-2 w-2 rounded-full"
            style={{ background: "var(--text-muted)" }}
          />
        </div>
      </div>
    </div>
  );
}
