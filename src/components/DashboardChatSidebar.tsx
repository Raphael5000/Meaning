"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./ChatMessage";
import ChartLoadingIndicator from "./ChartLoadingIndicator";
import {
  createChat,
  updateChat,
  titleFromFirstMessage,
  type Message,
  type StoredChat,
} from "@/lib/chatHistory";

const CHART_KEYWORDS = /\b(chart|graph|plot|visuali[sz]e|map|pie|bar chart|line chart|sankey|treemap|heatmap|funnel|radar|gauge)\b/i;

interface DashboardChatSidebarProps {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
}

export default function DashboardChatSidebar({ open, onClose, orgId }: DashboardChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [open]);

  const persistChat = useCallback((chat: StoredChat) => {
    updateChat(chat);
  }, []);

  async function sendMessage(content: string) {
    if (!orgId) {
      setError("Please select an account first.");
      return;
    }

    setError(null);
    setToolStatus(null);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const updatedMessages = [...messages, userMessage];
    const isNewChat = chatId === null && messages.length === 0;

    let chatIdToUpdate = chatId;

    if (isNewChat) {
      const newChat: StoredChat = {
        id: crypto.randomUUID(),
        title: titleFromFirstMessage(content),
        messages: [userMessage],
        createdAt: Date.now(),
      };
      chatIdToUpdate = newChat.id;
      setChatId(newChat.id);
      setMessages([userMessage]);
      createChat(newChat);
    } else {
      setMessages(updatedMessages);
    }

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
          orgId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let data: { message?: string; scorecard?: unknown; chart?: unknown; suggestedQuestions?: string[]; error?: string } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "status") {
              setToolStatus(event.message);
            } else if (event.type === "result") {
              data = event;
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      setToolStatus(null);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message || "",
        scorecard: data.scorecard as Message["scorecard"],
        chart: data.chart as Message["chart"],
        suggestedQuestions: data.suggestedQuestions,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Persist
      if (chatIdToUpdate) {
        const chatToSave: StoredChat = {
          id: chatIdToUpdate,
          title: titleFromFirstMessage(updatedMessages[0]?.content || ""),
          messages: finalMessages,
          createdAt: Date.now(),
        };
        persistChat(chatToSave);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
      setToolStatus(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() && !loading) {
      sendMessage(input.trim());
      setInput("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setChatId(null);
    setError(null);
    setToolStatus(null);
  }

  return (
    <div
      className="dashboard-chat-sidebar flex h-full flex-col border-l"
      style={{
        width: open ? "24rem" : "0px",
        minWidth: open ? "24rem" : "0px",
        borderColor: "var(--border-color)",
        background: "var(--bg-primary)",
        overflow: "hidden",
        transition: "width 300ms cubic-bezier(0.16, 1, 0.3, 1), min-width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">Chat</h3>
          {chatId && (
            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-md px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground whitespace-nowrap"
            >
              New chat
            </button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-xs text-muted-foreground px-4">
              Ask questions about your dashboard data in plain English.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                scorecard={msg.scorecard}
                scorecardRevealed={msg.scorecardRevealed}
                chart={msg.chart}
                suggestedQuestions={
                  i === messages.length - 1 ? msg.suggestedQuestions : undefined
                }
                onSuggestedQuestionClick={
                  msg.role === "assistant" ? (q) => sendMessage(q) : undefined
                }
              />
            ))}
            {loading && (
              CHART_KEYWORDS.test(messages[messages.length - 1]?.content || "")
                ? <ChartLoadingIndicator />
                : (
                  <div className="flex items-center gap-2 py-2">
                    <div
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current"
                      style={{ color: "var(--accent)", borderTopColor: "transparent" }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {toolStatus || "Thinking..."}
                    </span>
                  </div>
                )
            )}
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: "var(--border-color)" }}>
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            disabled={loading}
            rows={1}
            className="max-h-[120px] w-full resize-none rounded-xl border border-border bg-muted px-3 py-2.5 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="absolute bottom-2 right-2 h-7 w-7 rounded-full"
            style={{
              background: input.trim()
                ? "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)"
                : "transparent",
              color: input.trim() ? "#ffffff" : "var(--text-muted)",
            }}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
