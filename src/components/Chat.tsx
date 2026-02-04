"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import PropertySelector from "./PropertySelector";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_QUESTIONS = [
  "How many users visited my site this week?",
  "What are my top traffic sources?",
  "Which pages get the most views?",
  "Who is on my site right now?",
];

export default function Chat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(content: string) {
    if (!propertyId) {
      setError("Please select a GA4 property first.");
      return;
    }

    setError(null);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          propertyId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Request failed");
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message,
      };

      setMessages([...updatedMessages, assistantMessage]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setError(null);
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleNewChat}
            className="flex cursor-pointer items-center gap-2 rounded-[100px] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-primary)" }}
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New chat
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-64">
            <PropertySelector
              selectedPropertyId={propertyId}
              onSelect={(id, name) => {
                setPropertyId(id);
                setPropertyName(name);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            {session?.user?.image && (
              <img
                src={session.user.image}
                alt=""
                className="h-7 w-7 rounded-full"
              />
            )}
            <button
              onClick={() => signOut()}
              className="cursor-pointer rounded-[100px] px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !loading ? (
          /* Welcome screen */
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "var(--accent)" }}
            >
              <svg
                width="32"
                height="32"
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
            <h2
              className="mb-2 text-xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {propertyName
                ? `Ask about ${propertyName}`
                : "Chat with your Analytics"}
            </h2>
            <p
              className="mb-8 max-w-md text-center text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {propertyId
                ? "Ask any question about your website analytics in plain English."
                : "Select a GA4 property above to get started."}
            </p>

            {propertyId && (
              <div className="grid max-w-2xl grid-cols-2 gap-3">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="cursor-pointer rounded-[100px] border p-3 text-left text-sm transition-colors hover:bg-[var(--bg-hover)]"
                    style={{
                      borderColor: "var(--border-color)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Message list */
          <div>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2 text-sm"
          style={{ color: "var(--error)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto cursor-pointer rounded-[100px] px-3 py-1 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={loading || !propertyId} />
    </div>
  );
}
