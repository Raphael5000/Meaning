"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import PropertySelector from "./PropertySelector";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import AlertsModal from "./AlertsModal";
import {
  fetchChats,
  createChat,
  updateChat,
  deleteRemoteChat,
  titleFromFirstMessage,
  type Message,
  type StoredChat,
} from "@/lib/chatHistory";

const EXAMPLE_QUESTIONS = [
  "How many users visited my site this week?",
  "What are my top traffic sources?",
  "Which pages get the most views?",
  "Who is on my site right now?",
];

function truncateTitle(title: string, max = 36): string {
  if (title.length <= max) return title;
  return title.slice(0, max).trim() + "…";
}

function getInitials(name: string | null | undefined, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export default function Chat() {
  const { data: session } = useSession();

  const [chats, setChats] = useState<StoredChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("Free");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Load chats from the database when the session is available
  useEffect(() => {
    const sessionUserId = (session as { userId?: string } | null)?.userId;
    if (!sessionUserId) return;
    let cancelled = false;
    fetchChats().then((loaded) => {
      if (!cancelled) setChats(loaded);
    });
    return () => { cancelled = true; };
  }, [(session as { userId?: string } | null)?.userId]);

  useEffect(() => {
    // Keep the top of the latest answer in view instead of scrolling to the bottom
    const target = lastMessageRef.current ?? messagesEndRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages, loading]);

  // Fetch user plan for account section (plan name e.g. "Monthly")
  useEffect(() => {
    const sessionUserId = (session as { userId?: string } | null)?.userId;
    if (!session?.user || !sessionUserId) return;
    fetch("/api/user/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.subscription?.status === "active" && data?.subscription?.plan) {
          const plan = data.subscription.plan;
          setUserPlan(plan.charAt(0).toUpperCase() + plan.slice(1));
        }
      })
      .catch(() => {});
  }, [session]);

  // Close account menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [accountMenuOpen]);

  function selectChat(chat: StoredChat) {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setPropertyId(chat.propertyId ?? null);
    setPropertyName(chat.propertyName ?? "");
    setError(null);
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  function handleNewChat() {
    setCurrentChatId(null);
    setMessages([]);
    setError(null);
  }

  function updateCurrentChatInList(
    updater: (chat: StoredChat) => StoredChat
  ): void {
    if (!currentChatId) return;
    setChats((prev) =>
      prev.map((c) => (c.id === currentChatId ? updater(c) : c))
    );
  }

  /** Fire-and-forget save of a single chat to the database */
  const persistChat = useCallback((chat: StoredChat) => {
    updateChat(chat);
  }, []);

  function markScorecardRevealed(messageId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.scorecard
          ? { ...m, scorecardRevealed: true }
          : m
      )
    );
    if (!currentChatId) return;
    const chatId = currentChatId;
    setChats((prev) => {
      const updated = prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId && m.scorecard
                  ? { ...m, scorecardRevealed: true }
                  : m
              ),
            }
          : c
      );
      const chatToSave = updated.find((c) => c.id === chatId);
      if (chatToSave) persistChat(chatToSave);
      return updated;
    });
  }

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
    const isNewChat = currentChatId === null && messages.length === 0;

    // Capture the chat id we're updating so the async callback has the correct id
    // (currentChatId is still null in the closure when this is a new chat)
    let chatIdToUpdate: string | null = currentChatId;

    if (isNewChat) {
      const newChat: StoredChat = {
        id: crypto.randomUUID(),
        title: titleFromFirstMessage(content),
        messages: [userMessage],
        createdAt: Date.now(),
        propertyId: propertyId ?? undefined,
        propertyName: propertyName || undefined,
      };
      chatIdToUpdate = newChat.id;
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      setMessages([userMessage]);
      createChat(newChat);
    } else {
      setMessages(updatedMessages);
      if (currentChatId && messages.length === 0) {
        updateCurrentChatInList((c) => ({
          ...c,
          title: titleFromFirstMessage(content),
          messages: updatedMessages,
        }));
      } else {
        updateCurrentChatInList((c) => ({ ...c, messages: updatedMessages }));
      }
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
        scorecard: data.scorecard,
        suggestedQuestions: data.suggestedQuestions,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      // Use chatIdToUpdate so we update the right chat in the async callback
      // (avoids stale closure where currentChatId is still null for new chats)
      const idToUpdate = chatIdToUpdate;
      setChats((prev) => {
        const updated = prev.map((c) =>
          c.id === idToUpdate ? { ...c, messages: finalMessages } : c
        );
        // Persist the updated chat to the database
        const chatToSave = updated.find((c) => c.id === idToUpdate);
        if (chatToSave) persistChat(chatToSave);
        return updated;
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function deleteChat(e: React.MouseEvent, chatId: string) {
    e.stopPropagation();
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    deleteRemoteChat(chatId);
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
    }
  }

  const sortedChats = [...chats].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r transition-transform duration-200 md:relative md:z-auto md:translate-x-0 md:transition-[width] ${
          sidebarOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-transparent"
        }`}
        style={{
          borderColor: "var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        {/* Top row: logo */}
        <div className="flex items-center pl-[18px] pr-3 pt-[18px]">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Home">
            <Image
              src="/Hivory icon.svg"
              alt="Hivory"
              width={28}
              height={28}
              className="h-7 w-7"
            />
          </Link>
        </div>
        {/* New chat button */}
        <div className="px-3 py-2 pt-8 space-y-0.5">
          <button
            onClick={handleNewChat}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-primary)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            New chat
          </button>
          {/* Alerts */}
          <button
            type="button"
            onClick={() => setAlertsOpen(true)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-primary)" }}
            aria-label="Email alerts"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Alerts
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 pt-6">
          <p className="mb-2 px-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Chat history
          </p>
          {sortedChats.length === 0 ? (
            <p className="px-2 text-sm" style={{ color: "var(--text-muted)" }}>
              No chats yet
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sortedChats.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => selectChat(chat)}
                    className="group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-hover)]"
                    style={{
                      color: "var(--text-primary)",
                      backgroundColor: currentChatId === chat.id ? "var(--bg-hover)" : undefined,
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate" title={chat.title}>
                      {truncateTitle(chat.title)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => deleteChat(e, chat.id)}
                      className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-[var(--bg-tertiary)] group-hover:opacity-100"
                      style={{ color: "var(--text-muted)" }}
                      aria-label="Delete chat"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Account section - bottom left */}
        {session?.user && (
          <div
            ref={accountMenuRef}
            className="relative mt-auto border-t p-3"
            style={{ borderColor: "var(--border-color)" }}
          >
            <button
              type="button"
              onClick={() => setAccountMenuOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-primary)" }}
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {getInitials(session.user.name ?? null, session.user.email ?? null)}
                </div>
              )}
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {session.user.name ?? "Account"}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {userPlan}
                </p>
              </div>
            </button>

            {accountMenuOpen && (
              <div
                className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-lg shadow-lg"
                style={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <Link
                  href="/account"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: "var(--text-primary)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    signOut();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: "var(--text-primary)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-3 py-2 md:px-4 md:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-2 transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-primary)" }}
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
            <div className="w-48 md:w-64">
              <PropertySelector
                selectedPropertyId={propertyId}
                onSelect={(id, name) => {
                  setPropertyId(id);
                  setPropertyName(name);
                  if (currentChatId) {
                    const chatId = currentChatId;
                    setChats((prev) => {
                      const updated = prev.map((c) =>
                        c.id === chatId
                          ? { ...c, propertyId: id, propertyName: name }
                          : c
                      );
                      const chatToSave = updated.find((c) => c.id === chatId);
                      if (chatToSave) persistChat(chatToSave);
                      return updated;
                    });
                  }
                }}
              />
            </div>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !loading ? (
            <div className="flex h-full flex-col items-center justify-center px-4">
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
                <div className="flex max-w-2xl flex-wrap justify-center gap-3">
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
            <div>
              {messages.map((msg, index) => {
                const isLast = index === messages.length - 1;
                return (
                  <div
                    key={msg.id}
                    ref={isLast ? lastMessageRef : undefined}
                  >
                    <ChatMessage
                      role={msg.role}
                      content={msg.content}
                      scorecard={msg.scorecard}
                      scorecardRevealed={msg.scorecardRevealed}
                      suggestedQuestions={
                        messages[messages.length - 1]?.id === msg.id
                          ? msg.suggestedQuestions
                          : undefined
                      }
                      onSuggestedQuestionClick={
                        msg.role === "assistant"
                          ? (q) => sendMessage(q)
                          : undefined
                      }
                      onTypewriterComplete={
                        msg.role === "assistant" && msg.scorecard
                          ? () => markScorecardRevealed(msg.id)
                          : undefined
                      }
                    />
                  </div>
                );
              })}
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

        <ChatInput onSend={sendMessage} disabled={loading || !propertyId} />
      </div>

      <AlertsModal open={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </div>
  );
}
