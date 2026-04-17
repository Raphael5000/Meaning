"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Bell,
  Bug,
  ChevronLeft,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  SquarePen,
  Trash2,
  User,
  Users,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountSelector from "./AccountSelector";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import ChartLoadingIndicator from "./ChartLoadingIndicator";
import AlertsPanel from "./AlertsPanel";
import BugReportModal from "./BugReportModal";
import ConnectionsPanel from "./ConnectionsPanel";
import AccountPanel from "./AccountPanel";
import TeamPanel from "./TeamPanel";
import DashboardListPanel from "./DashboardListPanel";
import DashboardPanel from "./DashboardPanel";
import { OnboardingGuide } from "./OnboardingGuide";
import {
  fetchChats,
  createChat,
  updateChat,
  deleteRemoteChat,
  titleFromFirstMessage,
  type Message,
  type StoredChat,
} from "@/lib/chatHistory";

const CHART_KEYWORDS = /\b(chart|graph|plot|visuali[sz]e|map|pie|bar chart|line chart|sankey|treemap|heatmap|funnel|radar|gauge)\b/i;

const EXAMPLE_QUESTIONS = [
  "How many users visited my site this week?",
  "What are my top traffic sources?",
  "Which pages get the most views?",
  "Who is on my site right now?",
];

function truncateTitle(title: string, max = 36): string {
  if (title.length <= max) return title;
  return title.slice(0, max).trim() + "\u2026";
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
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    (session as { activeOrgId?: string } | null)?.activeOrgId ?? null
  );
  const [activeOrgName, setActiveOrgName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  // Connected data sources for the current property
  const [connectedSources, setConnectedSources] = useState<
    Array<{ type: string; status: string; label: string }>
  >([]);

  // Auto-open Connections modal after OAuth redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ads_connected") === "true" || params.get("linkedin_connected") === "true" || params.get("mailchimp_connected") === "true") {
      setConnectionsOpen(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);
  const [teamOpen, setTeamOpen] = useState(false);
  const [dashboardListOpen, setDashboardListOpen] = useState(false);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<string>("Free");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Load chats from the database when the session or active org changes
  useEffect(() => {
    const sessionUserId = (session as { userId?: string } | null)?.userId;
    if (!sessionUserId) return;
    let cancelled = false;
    fetchChats(activeOrgId).then((loaded) => {
      if (!cancelled) {
        setChats(loaded);
        // Reset to new chat when switching orgs
        setCurrentChatId(null);
        setMessages([]);
      }
    });
    return () => { cancelled = true; };
  }, [(session as { userId?: string } | null)?.userId, activeOrgId]);

  // Fetch connected data sources when property changes or connections modal closes
  const [connectionsVersion, setConnectionsVersion] = useState(0);

  const fetchConnectedSources = useCallback(() => {
    if (!activeOrgId) { setConnectedSources([]); return; }
    const url = `/api/user/connections?orgId=${activeOrgId}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const TYPE_LABELS: Record<string, string> = {
          GA4_BIGQUERY: "Google Analytics",
          GOOGLE_ADS: "Google Ads",
          SEARCH_CONSOLE: "Search Console",
          LINKEDIN: "LinkedIn",
          MAILCHIMP: "Mailchimp",
          MICROSOFT_ADS: "Microsoft Ads",
        };
        const sources = (data.dataSources ?? []).map((ds: { type: string; status: string }) => ({
          type: ds.type,
          status: ds.status,
          label: TYPE_LABELS[ds.type] ?? ds.type,
        }));
        setConnectedSources(sources);
      })
      .catch(() => setConnectedSources([]));
  }, [activeOrgId]);

  useEffect(() => {
    fetchConnectedSources();
  }, [activeOrgId, connectionsVersion, fetchConnectedSources]);

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
        if (data?.teamMembership) {
          setUserPlan("Team");
        } else if (data?.subscription?.status === "trialing") {
          setUserPlan("Free Trial");
        } else if (data?.subscription?.status === "active" && data?.subscription?.plan) {
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
    closeAllPanels();
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setError(null);
    // Close sidebar on mobile after selecting a chat
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  function closeAllPanels() {
    setAlertsOpen(false);
    setConnectionsOpen(false);
    setAccountOpen(false);
    setTeamOpen(false);
    setDashboardListOpen(false);
    setActiveDashboardId(null);
  }

  function handleNewChat() {
    closeAllPanels();
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
    if (!activeOrgId) {
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
        propertyId: undefined,
        propertyName: undefined,
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
          orgId: activeOrgId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || "Request failed");
      }

      // Read NDJSON stream for tool progress events
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let data: { message?: string; scorecard?: unknown; chart?: unknown; suggestedQuestions?: string[]; error?: string } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer
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
            if (e instanceof SyntaxError) continue; // skip malformed lines
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
      setToolStatus(null);
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

  // Show onboarding guide for new users who haven't completed it
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (!session?.user) return;
    try {
      if (localStorage.getItem("meaning-onboarding-done")) return;
    } catch {}
    // Small delay so the sidebar renders first
    const timer = setTimeout(() => setShowOnboarding(true), 800);
    return () => clearTimeout(timer);
  }, [session?.user]);

  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--bg-primary)" }}
    >
      <OnboardingGuide
        show={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col border-r transition-all duration-200 md:relative md:z-auto md:translate-x-0 ${
          sidebarOpen
            ? "w-64 translate-x-0"
            : "w-64 -translate-x-full md:w-14 md:translate-x-0"
        }`}
        style={{
          borderColor: "var(--border-color)",
          background: "var(--bg-secondary)",
        }}
      >
        {/* Account selector — hidden when collapsed */}
        {sidebarOpen && (
          <div className="pl-3 pr-4 pt-4">
            <div data-onboarding="team-selector">
            <AccountSelector
              activeOrgId={activeOrgId}
              onSelect={(org) => {
                setActiveOrgId(org.id);
                setActiveOrgName(org.name);
                fetch("/api/user/active-org", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orgId: org.id }),
                }).catch(() => {});
              }}
            />
          </div>
          </div>
        )}
        {/* Nav buttons */}
        <div className={`space-y-0.5 ${sidebarOpen ? "px-3 py-2 pt-4" : "px-2 py-2 pt-4"}`}>
          <Button
            variant="ghost"
            className={`sidebar-btn w-full ${sidebarOpen ? "justify-start gap-2" : "justify-center px-0"}`}
            onClick={handleNewChat}
            title="New chat"
            data-onboarding="new-chat"
          >
            <SquarePen className="sidebar-icon-write h-4 w-4 shrink-0" />
            {sidebarOpen && <span>New chat</span>}
          </Button>
          <Button
            variant="ghost"
            className={`sidebar-btn w-full ${sidebarOpen ? "justify-start gap-2" : "justify-center px-0"}`}
            onClick={() => { closeAllPanels(); setAlertsOpen(true); }}
            aria-label="Email alerts"
            title="Alerts"
          >
            <Bell className="sidebar-icon-bell h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Alerts</span>}
          </Button>
          <Button
            variant="ghost"
            className={`sidebar-btn w-full ${sidebarOpen ? "justify-start gap-2" : "justify-center px-0"}`}
            onClick={() => { closeAllPanels(); setDashboardListOpen(true); }}
            aria-label="Dashboards"
            title="Dashboards"
            data-onboarding="dashboards"
          >
            <LayoutDashboard className="sidebar-icon-dashboard h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Dashboards</span>}
          </Button>
        </div>
        <div className={`flex-1 overflow-y-auto p-2 pt-6 ${sidebarOpen ? "" : "hidden md:hidden"}`}>
          {sidebarOpen && <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
            Chat history
          </p>}
          {sortedChats.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">
              No chats yet
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sortedChats.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    onClick={() => selectChat(chat)}
                    className="group flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    style={{
                      backgroundColor: currentChatId === chat.id ? "var(--bg-hover)" : undefined,
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate" title={chat.title}>
                      {truncateTitle(chat.title)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => deleteChat(e, chat.id)}
                      className="shrink-0 cursor-pointer rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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
            data-onboarding="connections"
            className={`relative mt-auto border-t ${sidebarOpen ? "p-3" : "p-2"}`}
            style={{ borderColor: "var(--border-color)" }}
          >
            <button
              type="button"
              onClick={() => sidebarOpen ? setAccountMenuOpen((o) => !o) : setSidebarOpen(true)}
              className={`flex w-full cursor-pointer items-center rounded-lg text-foreground transition-colors hover:bg-accent ${sidebarOpen ? "gap-3 px-2 py-2" : "justify-center p-1.5"}`}
              title={sidebarOpen ? undefined : session.user.name ?? "Account"}
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className={`shrink-0 rounded-full object-cover ${sidebarOpen ? "h-9 w-9" : "h-7 w-7"}`}
                />
              ) : (
                <div
                  className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground ${sidebarOpen ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs"}`}
                >
                  {getInitials(session.user.name ?? null, session.user.email ?? null)}
                </div>
              )}
              {sidebarOpen && (
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-foreground">
                    {session.user.name ?? "Account"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userPlan}
                  </p>
                </div>
              )}
            </button>

            {accountMenuOpen && sidebarOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    closeAllPanels();
                    setAccountOpen(true);
                  }}
                  className="menu-btn flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <User className="menu-icon-user h-4 w-4" />
                  Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    closeAllPanels();
                    setConnectionsOpen(true);
                  }}
                  className="menu-btn flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Link2 className="menu-icon-link h-4 w-4" />
                  Connections
                </button>
                {userPlan !== "Free" && (
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      closeAllPanels();
                      setTeamOpen(true);
                    }}
                    className="menu-btn flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    <Users className="menu-icon-users h-4 w-4" />
                    Team
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setBugReportOpen(true);
                  }}
                  className="menu-btn flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Bug className="menu-icon-bug h-4 w-4" />
                  Report a bug
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    signOut();
                  }}
                  className="menu-btn flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <LogOut className="menu-icon-logout h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Sidebar toggle — mounted on the border, vertically centered with account selector */}
      <button
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        className="sidebar-toggle absolute z-[51] hidden h-5 w-5 items-center justify-center overflow-hidden rounded-full border bg-background text-muted-foreground shadow-sm transition-all hover:text-foreground md:flex"
        style={{
          borderColor: "var(--border-color)",
          top: "1.55rem",
          left: sidebarOpen ? "calc(16rem - 10px)" : "calc(3.5rem - 10px)",
          transition: "left 200ms ease",
        }}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <ChevronLeft
          className={`h-3 w-3 ${sidebarOpen ? "sidebar-toggle-icon-open" : "sidebar-toggle-icon-closed"}`}
          style={{ transform: sidebarOpen ? undefined : "rotate(180deg)" }}
        />
      </button>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only header toggle */}
        <header className="flex shrink-0 items-center justify-between px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Panels (replace messages area) */}
        {connectionsOpen ? (
          <ConnectionsPanel
            onClose={() => { setConnectionsOpen(false); setConnectionsVersion((v) => v + 1); }}
            orgId={activeOrgId}
            orgName={activeOrgName}
          />
        ) : accountOpen ? (
          <AccountPanel onClose={() => setAccountOpen(false)} />
        ) : alertsOpen ? (
          <AlertsPanel onClose={() => setAlertsOpen(false)} orgId={activeOrgId} />
        ) : teamOpen ? (
          <TeamPanel onClose={() => setTeamOpen(false)} />
        ) : activeDashboardId ? (
          <DashboardPanel
            dashboardId={activeDashboardId}
            onClose={() => { setActiveDashboardId(null); setDashboardListOpen(true); }}
          />
        ) : dashboardListOpen ? (
          <DashboardListPanel
            onClose={() => setDashboardListOpen(false)}
            onOpenDashboard={(id) => { setDashboardListOpen(false); setActiveDashboardId(id); }}
            orgId={activeOrgId}
            orgName={activeOrgName}
          />
        ) : <>
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !loading ? (
            <div className="flex h-full flex-col items-center justify-center px-4">
              {/* Welcome wizard — show when no data sources connected or no org */}
              {connectedSources.length === 0 ? (
                <div className="flex max-w-md flex-col items-center text-center">
                  <div
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)" }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-xl text-foreground">
                    Welcome to Meaning
                  </h2>
                  <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {activeOrgId
                      ? "Connect your first data source to start asking questions about your analytics in plain English."
                      : "Create a team above, then connect your first data source to get started."}
                  </p>
                  {activeOrgId && (
                    <button
                      onClick={() => setConnectionsOpen(true)}
                      className="mb-3 rounded-full px-6 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        background: "var(--text-primary)",
                        color: "var(--bg-primary)",
                      }}
                    >
                      Connect a data source
                    </button>
                  )}
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console
                  </p>
                </div>
              ) : (
              <>
              <h2 className="mb-2 text-xl text-foreground">
                {activeOrgName
                  ? `Ask about ${activeOrgName}`
                  : "Chat with your Analytics"}
              </h2>
              <p className="mb-8 max-w-md text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                Ask any question about your website analytics in plain English.
              </p>

              {activeOrgId && (
                <div className="flex max-w-2xl flex-wrap justify-center gap-3">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="cursor-pointer rounded-full border border-border p-3 text-left text-sm transition-colors hover:bg-accent"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              </>
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
                      chart={msg.chart}
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
              {loading &&
                (messages.length > 0 &&
                CHART_KEYWORDS.test(messages[messages.length - 1].content) ? (
                  <ChartLoadingIndicator />
                ) : (
                  <div className="flex w-full justify-center px-4 py-6">
                    <div className="flex w-full max-w-3xl">
                      <div className="flex items-center gap-2">
                        <span className="thinking-cursor" />
                        {toolStatus && (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {toolStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2 text-sm text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto cursor-pointer rounded-full px-3 py-1 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <ChatInput onSend={sendMessage} disabled={loading || !activeOrgId} dataSources={connectedSources} />
      </>}
      </div>

      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </div>
  );
}
