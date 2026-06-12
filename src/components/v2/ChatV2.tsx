"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AlertsPanelV2 from "@/components/v2/alerts/AlertsPanelV2";
import GoalsPanel from "@/components/v2/goals/GoalsPanel";

import ConnectionsV2 from "./connections/ConnectionsV2";
import SettingsPage from "@/components/v2/settings/SettingsPage";
import DashboardListPanel from "@/components/v2/dashboard/DashboardListPanel";
import DashboardPanel from "@/components/v2/dashboard/DashboardPanel";
import BugReportModal from "@/components/BugReportModal";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import {
  fetchChats,
  createChat,
  updateChat,
  deleteRemoteChat,
  togglePinChat,
  renameChat,
  titleFromFirstMessage,
  type Message,
  type StoredChat,
} from "@/lib/chatHistory";
import {
  Sidebar,
  type SidebarChat,
  type SidebarOrg,
} from "./Sidebar";
import { Composer } from "./Composer";
import { UserMsg, AssistantMsg } from "./Messages";
import {
  Scorecard,
  ChartCard,
  Suggested,
  AssistantContent,
} from "./attachments";
import { Thinking, Stages, ChartSkeleton, ErrorBanner, type Stage } from "./InFlight";
import { I } from "./icons";
import { Avatar, Mark } from "./primitives";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { TooltipProvider } from "./ui/tooltip";

const CHART_KEYWORDS =
  /\b(chart|graph|plot|visuali[sz]e|map|pie|bar chart|line chart|sankey|treemap|heatmap|funnel|radar|gauge)\b/i;

/** Time-of-day greeting (24h based, GMT-naive — uses the user's local clock). */
function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 22) return "Evening";
  return "Late night";
}

function firstName(name?: string | null): string {
  if (!name?.trim()) return "";
  return name.trim().split(/\s+/)[0];
}

/** Map data-source `type` → public-asset logo path used by the source bubbles. */
const SOURCE_ICON: Record<string, { icon: string; label: string }> = {
  GA4_BIGQUERY: { icon: "/Google Analytics.svg", label: "Google Analytics" },
  GOOGLE_ADS: { icon: "/Google Ads.svg", label: "Google Ads" },
  SEARCH_CONSOLE: { icon: "/Search Console.svg", label: "Search Console" },
  LINKEDIN: { icon: "/Linkedin.svg", label: "LinkedIn" },
  MAILCHIMP: { icon: "/Mailchimp.svg", label: "Mailchimp" },
  MICROSOFT_ADS: { icon: "/Microsoft Ads.svg", label: "Microsoft Ads" },
  AHREFS: { icon: "/Ahrefs.svg", label: "Ahrefs" },
  ATTIO: { icon: "/Attio.svg", label: "Attio" },
};

interface OrgApi {
  id: string;
  name: string;
  imageUrl?: string | null;
  ownerId?: string;
  role?: string;
}

/** Chart data may arrive as ECharts-native `{ title: { text, subtext } }` or as
 *  a simpler `{ title: "…" }`.  Pull the title string defensively, and return
 *  an option object with the title stripped so ECharts doesn't double-render it
 *  inside the chart body (the card header already shows it).                   */
function extractChartTitle(chart: Record<string, unknown>): string {
  const t = chart.title;
  if (typeof t === "string" && t.trim()) return t;
  if (t && typeof t === "object") {
    const inner = (t as { text?: unknown }).text;
    if (typeof inner === "string" && inner.trim()) return inner;
  }
  return "Chart";
}

function stripChartTitle(
  chart: Record<string, unknown>
): Record<string, unknown> {
  const { title: _title, ...rest } = chart;
  return rest;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function orgInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

type ConnectionsSourceType =
  | "GA4_BIGQUERY"
  | "GOOGLE_ADS"
  | "SEARCH_CONSOLE"
  | "LINKEDIN"
  | "MAILCHIMP"
  | "MICROSOFT_ADS";

type ActivePanel =
  | { kind: "none" }
  | { kind: "connections"; initialSourceType?: ConnectionsSourceType }
  | { kind: "alerts" }
  | { kind: "goals" }
  | { kind: "reports" }
  | { kind: "team" }
  | { kind: "account" }
  | { kind: "dashboardList" }
  | { kind: "dashboard"; id: string };

export default function ChatV2() {
  const { data: session } = useSession();

  const [chats, setChats] = React.useState<StoredChat[]>([]);
  const [currentChatId, setCurrentChatId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [initialLoaded, setInitialLoaded] = React.useState(false);
  const [toolStatus, setToolStatus] = React.useState<string | null>(null);
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [streamingText, setStreamingText] = React.useState<string>("");
  /* "narration" while the model is thinking / choosing tools — stream text
     goes into the muted Thinking tail. "final" after the server emits
     `final_start` (tools are done, model is composing the answer) — stream
     text routes into a proper AssistantMsg bubble with progressive
     rendering (InsightCard skeleton → populated card, markdown tables
     stream row-by-row, etc.) so the final answer never pops in whole.  */
  const [streamPhase, setStreamPhase] = React.useState<
    "narration" | "final"
  >("narration");

  /* Streaming smoother: buffer incoming text_delta chunks and reveal
     characters on a fixed 40ms cadence (~25fps). Fixed interval is
     gentler on React than rAF — once we switch into the "final" phase
     the AssistantMsg renders markdown + insight cards on every update,
     and react-markdown's re-parse can exceed 16ms for a growing table,
     causing visible chunking at 60fps. 25fps gives react-markdown ~40ms
     of headroom per tick and keeps the typewriter feel smooth.
     Per-tick step is capped at 6 chars (~150 cps) so big bursts from
     the network don't dump visible chunks — we still catch up quickly
     on big gaps, just never in a single jarring drop.                   */
  const streamTargetRef = React.useRef<string>("");
  const streamTimerRef = React.useRef<number | null>(null);

  const revealTick = React.useCallback(() => {
    streamTimerRef.current = null;
    React.startTransition(() => {
      setStreamingText((current) => {
        const target = streamTargetRef.current;
        if (current.length >= target.length) return current;
        const gap = target.length - current.length;
        const step = Math.min(6, Math.max(2, Math.ceil(gap / 12)));
        return target.slice(0, current.length + step);
      });
    });
    // Always keep the timer running while we still have buffer to reveal.
    if (streamTargetRef.current.length > 0) {
      streamTimerRef.current = window.setTimeout(revealTick, 40);
    }
  }, []);

  const scheduleReveal = React.useCallback(() => {
    if (streamTimerRef.current !== null) return;
    streamTimerRef.current = window.setTimeout(revealTick, 40);
  }, [revealTick]);

  const resetStreaming = React.useCallback(() => {
    streamTargetRef.current = "";
    setStreamingText("");
    if (streamTimerRef.current !== null) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (streamTimerRef.current !== null) {
        clearTimeout(streamTimerRef.current);
      }
    };
  }, []);
  const [error, setError] = React.useState<string | null>(null);
  const [activeOrgId, setActiveOrgId] = React.useState<string | null>(
    (session as { activeOrgId?: string } | null)?.activeOrgId ?? null
  );
  const [orgs, setOrgs] = React.useState<OrgApi[]>([]);
  const [sidebarOpen, setSidebarOpen] = React.useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );
  const [activePanel, setActivePanel] = React.useState<ActivePanel>({
    kind: "none",
  });
  const [bugReportOpen, setBugReportOpen] = React.useState(false);
  const [userPlan, setUserPlan] = React.useState<string>("");
  const [connectedSources, setConnectedSources] = React.useState<
    Array<{ type: string; status: string; label: string }>
  >([]);
  const [connectionsVersion, setConnectionsVersion] = React.useState(0);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string;
    title: string;
  } | null>(null);
  const [renamingChatId, setRenamingChatId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false);
  const [createTeamName, setCreateTeamName] = React.useState("");
  const [creatingTeam, setCreatingTeam] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const lastMessageRef = React.useRef<HTMLDivElement>(null);

  /* ----- Data loading ----- */

  React.useEffect(() => {
    const userId = (session as { userId?: string } | null)?.userId;
    if (!userId) return;
    setInitialLoaded(false);
    let cancelled = false;
    fetchChats(activeOrgId).then((loaded) => {
      if (!cancelled) {
        setChats(loaded);
        setCurrentChatId(null);
        setMessages([]);
        setInitialLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [(session as { userId?: string } | null)?.userId, activeOrgId]);

  React.useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data) => {
        const list: OrgApi[] = data.organizations ?? [];
        setOrgs(list);
        if (!activeOrgId && list.length > 0) {
          setActiveOrgId(list[0].id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!activeOrgId) {
      setConnectedSources([]);
      return;
    }
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
        const sources = (data.dataSources ?? []).map(
          (ds: { type: string; status: string }) => ({
            type: ds.type,
            status: ds.status,
            label: TYPE_LABELS[ds.type] ?? ds.type,
          })
        );
        setConnectedSources(sources);
      })
      .catch(() => setConnectedSources([]));
  }, [activeOrgId, connectionsVersion]);

  React.useEffect(() => {
    const target = lastMessageRef.current ?? messagesEndRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages, loading]);

  React.useEffect(() => {
    const userId = (session as { userId?: string } | null)?.userId;
    if (!session?.user || !userId) return;
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teamMembership) setUserPlan("Team");
        else if (
          data?.subscription?.status === "trialing" &&
          data?.subscription?.currentPeriodEnd
        ) {
          const endDate = new Date(data.subscription.currentPeriodEnd);
          const daysLeft = Math.max(
            0,
            Math.ceil(
              (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          );
          setUserPlan(
            daysLeft === 1 ? "1 day left in trial" : `${daysLeft} days left in trial`
          );
        } else if (
          data?.subscription?.status === "active" &&
          data?.subscription?.plan
        ) {
          const plan = data.subscription.plan as string;
          setUserPlan(plan.charAt(0).toUpperCase() + plan.slice(1));
        }
      })
      .catch(() => {});
  }, [session]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Map OAuth callback `*_connected=true` params to a specific source type
    // so we can open ConnectionsV2 directly in the detail view. Landing on the
    // list view after OAuth leaves users staring at "Not connected" rows until
    // they go pick accounts — exactly the Microsoft Ads panic pattern.
    const oauthMap: Array<[string, ConnectionsSourceType]> = [
      ["ga_connected", "GA4_BIGQUERY"],
      ["ads_connected", "GOOGLE_ADS"],
      ["gsc_connected", "SEARCH_CONSOLE"],
      ["linkedin_connected", "LINKEDIN"],
      ["mailchimp_connected", "MAILCHIMP"],
      ["ms_ads_connected", "MICROSOFT_ADS"],
    ];
    const hit = oauthMap.find(([p]) => params.get(p) === "true");
    if (hit) {
      setActivePanel({ kind: "connections", initialSourceType: hit[1] });
      window.history.replaceState({}, "", "/");
    }
  }, []);

  React.useEffect(() => {
    if (!session?.user) return;
    try {
      if (localStorage.getItem("meaning-onboarding-done")) return;
    } catch {}
    if (chats.length > 0) {
      try {
        localStorage.setItem("meaning-onboarding-done", "true");
      } catch {}
      return;
    }
    const timer = setTimeout(() => setShowOnboarding(true), 800);
    return () => clearTimeout(timer);
  }, [session?.user, chats.length]);

  /* ----- Keyboard shortcut: ⌘N / Ctrl+N → new chat ----- */
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewChat();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- Chat actions ----- */

  const persistChat = React.useCallback((chat: StoredChat) => {
    updateChat(chat);
  }, []);

  function selectChat(id: string) {
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    setActivePanel({ kind: "none" });
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setError(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function handleNewChat() {
    setActivePanel({ kind: "none" });
    setConnectionsVersion((v) => v + 1);
    setCurrentChatId(null);
    setMessages([]);
    setError(null);
    setStages([]);
  }

  function handleTogglePin(chat: SidebarChat) {
    const newPinned = !chat.pinned;
    setChats((prev) =>
      prev.map((c) => (c.id === chat.id ? { ...c, pinned: newPinned } : c))
    );
    togglePinChat(chat.id, newPinned);
  }

  function handleStartRename(chat: SidebarChat) {
    setRenamingChatId(chat.id);
    setRenameValue(chat.title);
  }

  function handleRenameSubmit() {
    if (!renamingChatId) return;
    const next = renameValue.trim();
    if (!next) {
      setRenamingChatId(null);
      return;
    }
    setChats((prev) =>
      prev.map((c) => (c.id === renamingChatId ? { ...c, title: next } : c))
    );
    renameChat(renamingChatId, next);
    setRenamingChatId(null);
  }

  function handleRenameCancel() {
    setRenamingChatId(null);
  }

  function handleDeleteRequest(chat: SidebarChat) {
    setDeleteTarget({ id: chat.id, title: chat.title });
  }

  function confirmDeleteChat() {
    if (!deleteTarget) return;
    setChats((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    deleteRemoteChat(deleteTarget.id);
    if (currentChatId === deleteTarget.id) {
      setCurrentChatId(null);
      setMessages([]);
    }
    setDeleteTarget(null);
  }

  async function handleCreateTeam() {
    const name = createTeamName.trim();
    if (!name) return;
    setCreatingTeam(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Could not create team");
      }
      const { organization } = (await res.json()) as {
        organization: { id: string; name: string; imageUrl: string | null };
      };
      const newOrg: OrgApi = {
        id: organization.id,
        name: organization.name,
        imageUrl: organization.imageUrl ?? null,
      };
      setOrgs((prev) => [...prev, newOrg]);
      setActiveOrgId(organization.id);
      setActivePanel({ kind: "none" });
      setCreateTeamOpen(false);
      setCreateTeamName("");
      toast.success(`Created “${organization.name}”.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create team");
    } finally {
      setCreatingTeam(false);
    }
  }

  function handleSwitchOrg(orgId: string) {
    const next = orgs.find((o) => o.id === orgId);
    if (!next) return;
    setActiveOrgId(next.id);
    setActivePanel({ kind: "none" });
    fetch("/api/user/active-org", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: next.id }),
    }).catch(() => {});
  }

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
      const toSave = updated.find((c) => c.id === chatId);
      if (toSave) persistChat(toSave);
      return updated;
    });
  }

  async function sendMessage(content: string) {
    if (!activeOrgId) {
      setError("Please select a workspace first.");
      return;
    }

    setError(null);
    setToolStatus(null);
    setStages([]);
    setStreamPhase("narration");
    resetStreaming();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const updatedMessages = [...messages, userMessage];
    const isNewChat = currentChatId === null && messages.length === 0;
    let chatIdToUpdate: string | null = currentChatId;

    if (isNewChat) {
      const newChat: StoredChat = {
        id: crypto.randomUUID(),
        title: titleFromFirstMessage(content),
        messages: [userMessage],
        createdAt: Date.now(),
      };
      chatIdToUpdate = newChat.id;
      setChats((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      setMessages([userMessage]);
      createChat(newChat);
    } else {
      setMessages(updatedMessages);
      if (currentChatId && messages.length === 0) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === currentChatId
              ? {
                  ...c,
                  title: titleFromFirstMessage(content),
                  messages: updatedMessages,
                }
              : c
          )
        );
      } else {
        setChats((prev) =>
          prev.map((c) =>
            c.id === currentChatId ? { ...c, messages: updatedMessages } : c
          )
        );
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
        const errData = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          usage?: { used: number; limit: number; resetsAt: string };
        };

        if (
          res.status === 402 &&
          errData.code === "FREE_TIER_LIMIT_REACHED"
        ) {
          // Free-tier monthly chat cap hit. Show a clear upgrade message and
          // bounce to /pricing so the user can act on it.
          const used = errData.usage?.used ?? "?";
          const limit = errData.usage?.limit ?? 20;
          const resetMsg = errData.usage?.resetsAt
            ? ` Resets ${new Date(errData.usage.resetsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`
            : "";
          setError(
            `You've used ${used} of ${limit} free messages this month.${resetMsg} Upgrade to Pro for unlimited chat — redirecting…`
          );
          setLoading(false);
          setTimeout(() => {
            window.location.href = "/pricing";
          }, 1500);
          return;
        }

        throw new Error(errData.error || "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let data: {
        message?: string;
        scorecard?: unknown;
        chart?: unknown;
        suggestedQuestions?: string[];
        error?: string;
      } = {};

      const stageTimers = new Map<string, number>();

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
            } else if (event.type === "round_start") {
              // New LLM round — prior "thinking aloud" text is done, reset buffer
              resetStreaming();
            } else if (event.type === "final_start") {
              // Tools are done. The next stream of text_deltas is the final
              // answer — route them into a proper AssistantMsg bubble with
              // progressive rendering rather than the muted thinking tail.
              setStreamPhase("final");
            } else if (event.type === "final_cancel") {
              // Model surprised us with another tool round after we'd
              // flipped to "final". Revert.
              setStreamPhase("narration");
              resetStreaming();
            } else if (event.type === "text_delta") {
              streamTargetRef.current += event.text as string;
              scheduleReveal();
            } else if (event.type === "stage_start") {
              const id: string = event.id;
              stageTimers.set(id, Date.now());
              const stage: Stage = {
                id,
                label: event.label,
                detail: event.detail,
                status: "active",
              };
              /* Tool calls now run in parallel on the server — multiple
                 stages can be active at once. Only stage_done closes a
                 stage; never auto-close on new start. */
              setStages((prev) => [...prev, stage]);
            } else if (event.type === "stage_done") {
              const id: string = event.id;
              const dur =
                typeof event.duration === "number"
                  ? event.duration
                  : stageTimers.get(id)
                    ? (Date.now() - stageTimers.get(id)!) / 1000
                    : undefined;
              stageTimers.delete(id);
              setStages((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, status: "done", duration: dur } : s
                )
              );
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
      setStages([]);
      setStreamPhase("narration");
      resetStreaming();

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
      const idToUpdate = chatIdToUpdate;
      setChats((prev) => {
        const updated = prev.map((c) =>
          c.id === idToUpdate ? { ...c, messages: finalMessages } : c
        );
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
      setStages([]);
      setStreamPhase("narration");
      resetStreaming();
    }
  }

  /* ----- Derived sidebar data ----- */

  const sidebarChats: SidebarChat[] = chats.map((c) => ({
    id: c.id,
    title: c.title,
    pinned: c.pinned,
    active: c.id === currentChatId,
    createdAt: c.createdAt,
  }));

  const activeOrg = orgs.find((o) => o.id === activeOrgId);
  const sidebarOrg: SidebarOrg | null = activeOrg
    ? {
        id: activeOrg.id,
        name: activeOrg.name,
        initials: orgInitials(activeOrg.name),
      }
    : null;
  const sidebarOrgsList: SidebarOrg[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    initials: orgInitials(o.name),
  }));

  const userForSidebar = session?.user
    ? {
        name: session.user.name ?? "Account",
        planLabel: userPlan,
        initials: getInitials(session.user.name, session.user.email),
        imageUrl: session.user.image,
      }
    : null;

  const activeRoute: "chat" | "dashboards" | "alerts" | "goals" | "reports" | "connections" =
    activePanel.kind === "connections"
      ? "connections"
      : activePanel.kind === "alerts"
        ? "alerts"
        : activePanel.kind === "goals"
          ? "goals"
          : activePanel.kind === "reports"
            ? "reports"
            : activePanel.kind === "dashboard" || activePanel.kind === "dashboardList"
              ? "dashboards"
              : "chat";

  /* ----- Render ----- */

  const hasActivePanel = activePanel.kind !== "none";
  const lastMessageIsChartRequest =
    messages.length > 0 &&
    CHART_KEYWORDS.test(messages[messages.length - 1].content);

  const activeSources = connectedSources.filter(
    (s) => s.status === "ACTIVE" || s.status === "BACKFILLING" || s.status === "PENDING"
  );
  const erroredSources = connectedSources.filter((s) => s.status === "ERROR");

  const accountMenu = userForSidebar ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-v2-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink"
        >
          {userForSidebar.imageUrl ? (
            <img
              src={userForSidebar.imageUrl}
              alt=""
              className="h-[30px] w-[30px] shrink-0 rounded-md object-cover"
            />
          ) : (
            <Avatar initials={userForSidebar.initials} size={30} />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-v2-ink">
              {userForSidebar.name}
            </div>
            <div className="text-[10.5px] text-v2-ink-muted">
              {userForSidebar.planLabel}
            </div>
          </div>
          <I.Chevron size={13} className="rotate-180 text-v2-ink-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={6} className="w-[240px]">
        <DropdownMenuItem onSelect={() => setActivePanel({ kind: "account" })}>
          <I.User />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setActivePanel({ kind: "connections" })}>
          <I.Link />
          Connections
        </DropdownMenuItem>
        {userPlan !== "Free" && (
          <DropdownMenuItem onSelect={() => setActivePanel({ kind: "team" })}>
            <I.Users />
            Team
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setBugReportOpen(true)}>
          <I.Bug />
          Report a bug
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()}>
          <I.Logout />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="meaning-v2 relative flex h-screen bg-v2-bg">
      <OnboardingGuide
        show={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Desktop sidebar toggle — sits on the sidebar's right border, animates
          with the sidebar width. z-40 keeps it above the sidebar (z-30) so
          its left half isn't clipped, but BELOW shadcn Sheet/Dialog overlays
          (z-50) so it disappears behind the alerts edit drawer instead of
          poking through it.                                                  */}
      <button
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        className="absolute top-[1.55rem] z-40 hidden h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-v2-line-strong bg-v2-surface text-v2-ink-muted shadow-sm transition-[left,color] duration-200 ease-[var(--v2-ease)] hover:border-v2-ink hover:text-v2-ink md:flex"
        style={{
          left: sidebarOpen ? "calc(272px - 10px)" : "calc(3.5rem - 10px)",
        }}
      >
        <I.ChevronL
          size={12}
          className={`transition-transform duration-200 ${
            sidebarOpen ? "" : "rotate-180"
          }`}
        />
      </button>

      {/* Sidebar wrapper.
            Mobile (fixed slide-in): z-50 stays above the mobile backdrop (z-40).
            Desktop (md:static + translate-x-0 creates a stacking context): drop
            to z-30 so shadcn Sheet/Dialog overlays (z-50) cover it cleanly
            instead of sitting behind it.                                       */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:z-30 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          collapsed={!sidebarOpen}
          org={sidebarOrg}
          orgs={sidebarOrgsList}
          chats={sidebarChats}
          user={userForSidebar}
          connectionErrors={erroredSources.length}
          activeRoute={activeRoute}
          renamingChatId={renamingChatId}
          renameValue={renameValue}
          onRenameChange={setRenameValue}
          onRenameSubmit={handleRenameSubmit}
          onRenameCancel={handleRenameCancel}
          onNewChat={handleNewChat}
          onSelectChat={selectChat}
          onPinChat={handleTogglePin}
          onStartRename={handleStartRename}
          onDeleteChat={handleDeleteRequest}
          onSwitchOrg={handleSwitchOrg}
          onCreateTeam={() => {
            setCreateTeamName("");
            setCreateTeamOpen(true);
          }}
          onManageWorkspace={() => setActivePanel({ kind: "team" })}
          onOpenDashboards={() => setActivePanel({ kind: "dashboardList" })}
          onOpenAlerts={() => setActivePanel({ kind: "alerts" })}
          onOpenGoals={() => setActivePanel({ kind: "goals" })}
          onOpenReports={() => setActivePanel({ kind: "reports" })}
          onOpenConnections={() => setActivePanel({ kind: "connections" })}
          accountMenu={accountMenu}
        />
      </div>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-v2-line px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="rounded-md p-1.5 text-v2-ink transition-colors hover:bg-v2-surface-2"
          >
            <I.Menu size={18} />
          </button>
          <div className="text-[13px] font-semibold text-v2-ink">Meaning</div>
          <div className="w-[30px]" />
        </header>

        {/* Connection error banner */}
        {erroredSources.length > 0 && activePanel.kind !== "connections" && (
          <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <I.Alert size={14} className="shrink-0" />
            <span className="flex-1">
              {erroredSources.length === 1
                ? `${erroredSources[0].label} connection has an error`
                : `${erroredSources.length} connections have errors`}
            </span>
            <button
              type="button"
              onClick={() => {
                const firstErrorType = erroredSources[0]?.type as ConnectionsSourceType | undefined;
                setActivePanel({ kind: "connections", initialSourceType: firstErrorType });
              }}
              className="shrink-0 rounded-md bg-red-600 px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-red-700"
            >
              Fix this
            </button>
          </div>
        )}

        {hasActivePanel ? (
          activePanel.kind === "connections" ? (
            <ConnectionsV2
              onClose={() => {
                setActivePanel({ kind: "none" });
                setConnectionsVersion((v) => v + 1);
              }}
              orgId={activeOrgId}
              orgName={activeOrg?.name ?? ""}
              initialSourceType={activePanel.initialSourceType ?? null}
            />
          ) : (
          <V1PanelWrapper>
            {activePanel.kind === "alerts" && (
              <AlertsPanelV2
                onClose={() => setActivePanel({ kind: "none" })}
                orgId={activeOrgId}
              />
            )}
            {activePanel.kind === "goals" && (
              <GoalsPanel
                onClose={() => setActivePanel({ kind: "none" })}
                orgId={activeOrgId}
              />
            )}
            {(activePanel.kind === "team" ||
              activePanel.kind === "account") && (
              <SettingsPage
                initialTab={activePanel.kind === "team" ? "team" : "account"}
                orgId={activeOrgId}
                orgName={activeOrg?.name ?? ""}
                onClose={() => setActivePanel({ kind: "none" })}
              />
            )}
            {activePanel.kind === "dashboardList" && (
              <DashboardListPanel
                onClose={() => setActivePanel({ kind: "none" })}
                onOpenDashboard={(id) =>
                  setActivePanel({ kind: "dashboard", id })
                }
                orgId={activeOrgId}
                orgName={activeOrg?.name ?? ""}
              />
            )}
            {activePanel.kind === "dashboard" && (
              <DashboardPanel
                dashboardId={activePanel.id}
                onClose={() => setActivePanel({ kind: "dashboardList" })}
                orgId={activeOrgId}
              />
            )}
          </V1PanelWrapper>
          )
        ) : (
          <>
            <div
              className="flex-1 overflow-y-auto px-4 md:px-6"
              style={{ scrollbarGutter: "stable" }}
            >
              {messages.length === 0 && !loading && !initialLoaded ? (
                <CenterSpinner />
              ) : messages.length === 0 && !loading ? (
                <EmptyHero
                  userName={firstName(session?.user?.name)}
                  activeOrgId={activeOrgId}
                  connectedSources={connectedSources}
                  onConnect={() => setActivePanel({ kind: "connections" })}
                  composer={
                    <Composer
                      disabled={loading || !activeOrgId}
                      streaming={loading}
                      sources={activeSources}
                      onSend={sendMessage}
                    />
                  }
                />
              ) : (
                <div>
                  {messages.map((msg, index) => {
                    const isLast = index === messages.length - 1;
                    const showSuggestions =
                      isLast &&
                      msg.role === "assistant" &&
                      msg.suggestedQuestions &&
                      msg.suggestedQuestions.length > 0;
                    return (
                      <div
                        key={msg.id}
                        ref={isLast ? lastMessageRef : undefined}
                      >
                        {msg.role === "user" ? (
                          <UserMsg>{msg.content}</UserMsg>
                        ) : (
                          <AssistantMsg>
                            {msg.scorecard && (
                              <Scorecard
                                value={msg.scorecard.value}
                                label={msg.scorecard.label}
                                change={msg.scorecard.change}
                              />
                            )}
                            {msg.chart && (
                              <ChartCard
                                title={extractChartTitle(
                                  msg.chart as Record<string, unknown>
                                )}
                                option={stripChartTitle(
                                  msg.chart as Record<string, unknown>
                                )}
                              />
                            )}
                            <div className="prose-chat">
                              <AssistantContent text={msg.content} />
                            </div>
                            {showSuggestions && (
                              <Suggested
                                items={msg.suggestedQuestions ?? []}
                                onSelect={sendMessage}
                              />
                            )}
                          </AssistantMsg>
                        )}
                      </div>
                    );
                  })}

                  {loading && (
                    <>
                      {stages.length > 0 && (
                        <div className="mx-auto w-full max-w-[780px] py-3">
                          <Stages steps={stages} />
                        </div>
                      )}
                      {streamPhase === "final" && streamingText.length > 0 ? (
                        /* Final answer is streaming. Render into a proper
                           AssistantMsg bubble via AssistantContent so the
                           InsightCard appears as a skeleton then populates,
                           markdown tables stream row-by-row, and the body
                           fills in progressively. No big "pop" at the end. */
                        <AssistantMsg thinking>
                          <div className="prose-chat">
                            <AssistantContent
                              text={streamingText}
                              streaming
                            />
                          </div>
                        </AssistantMsg>
                      ) : (
                        /* Narration phase (or empty) — muted thinking tail. */
                        <Thinking
                          status={toolStatus}
                          streamingText={streamingText}
                        />
                      )}
                      {lastMessageIsChartRequest &&
                        stages.length === 0 &&
                        !streamingText && <ChartSkeleton />}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Below-scroll wrapper: adds 10px of right padding to match the
                scrollbar gutter reserved on the scroll area above.  Without
                this, the scroll area is 10px narrower than the composer and
                centered content drifts out of alignment. Hidden when the
                chat is empty — EmptyHero owns the composer in that state so
                it can be visually centered with the greeting + bubbles.    */}
            {!(messages.length === 0 && !loading) && (
              <div style={{ paddingRight: 10 }}>
                {error && (
                  <div className="mx-auto w-full max-w-[780px] px-4 pb-2 md:px-6">
                    <ErrorBanner detail={error} onRetry={undefined} />
                  </div>
                )}

                <div className="px-4 md:px-6">
                  <Composer
                    disabled={loading || !activeOrgId}
                    streaming={loading}
                    sources={activeSources}
                    onSend={sendMessage}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BugReportModal
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />

      {/* Create new team */}
      <Dialog
        open={createTeamOpen}
        onOpenChange={(open) => {
          if (!creatingTeam) setCreateTeamOpen(open);
        }}
      >
        <DialogContent className="meaning-v2 sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create new team</DialogTitle>
            <DialogDescription>
              A team holds its own data sources, dashboards, and members. You can
              switch between teams from the sidebar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label
              htmlFor="create-team-name"
              className="text-[12.5px] font-medium text-foreground"
            >
              Team name
            </label>
            <Input
              id="create-team-name"
              autoFocus
              value={createTeamName}
              onChange={(e) => setCreateTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && createTeamName.trim() && !creatingTeam) {
                  e.preventDefault();
                  handleCreateTeam();
                }
              }}
              placeholder="Acme Co."
              disabled={creatingTeam}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateTeamOpen(false)}
              disabled={creatingTeam}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTeam}
              disabled={creatingTeam || !createTeamName.trim()}
            >
              {creatingTeam ? "Creating…" : "Create team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}

/* ========================================================================
   Subcomponents
   ======================================================================== */

function CenterSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <div
        className="h-8 w-8 rounded-full border-2 border-v2-ink-muted border-t-transparent"
        style={{ animation: "v2-spin 0.9s linear infinite" }}
      />
      <style>{`@keyframes v2-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/**
 * Empty hero — Claude-style "centered everything" pattern.
 *
 *   <Greeting>     ← time-of-day + first name
 *   <Composer />   ← visual center of the page
 *   <SourceBubbles /> ← connected data sources, with logos
 *
 * Owns the composer when there are no messages so the layout reads as a
 * single centered block. The bottom composer is hidden in this state.
 *
 * No-sources branch keeps a clear "Connect a data source" CTA — the
 * composer would be useless without sources, so we don't render it.
 */
function EmptyHero({
  userName,
  activeOrgId,
  connectedSources,
  onConnect,
  composer,
}: {
  userName: string;
  activeOrgId: string | null;
  connectedSources: Array<{ type: string; status: string; label: string }>;
  onConnect: () => void;
  composer: React.ReactNode;
}) {
  const greeting = userName
    ? `${timeOfDayGreeting()}, ${userName}`
    : timeOfDayGreeting();
  const activeSources = connectedSources.filter(
    (s) => s.status === "ACTIVE" || s.status === "BACKFILLING" || s.status === "PENDING"
  );
  const hasSources = activeSources.length > 0;

  // No-sources branch: skip the composer + greeting flourish, push them
  // toward the connect flow.
  if (!hasSources) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-v2-line bg-v2-surface-2 text-v2-ink-muted">
          <I.Db size={22} />
        </div>
        <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.01em] text-v2-ink">
          Welcome to Meaning
        </h2>
        <p className="mb-5 max-w-[360px] text-[13.5px] text-v2-ink-muted">
          {activeOrgId
            ? "Connect your first data source to start asking questions about your analytics in plain English."
            : "Create a workspace, then connect your first data source to get started."}
        </p>
        {activeOrgId && (
          <Button variant="primary" onClick={onConnect}>
            Connect a data source
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-[760px]">
        <h1
          className="mb-7 flex items-center justify-center gap-3 text-center
                     text-[34px] font-semibold tracking-[-0.025em] text-v2-ink
                     md:text-[40px]"
        >
          <Mark size={36} />
          <span>{greeting}</span>
        </h1>
        {composer}
        <SourceBubbles sources={activeSources} />
      </div>
    </div>
  );
}

/**
 * Horizontal row of connected-source bubbles below the empty-state composer.
 * Each bubble: 16px source logo + label, on a soft surface chip. Read-only
 * — these signal "you have these connected" rather than acting as quick
 * actions. Wraps cleanly on narrow widths.
 */
function SourceBubbles({
  sources,
}: {
  sources: Array<{ type: string; status: string; label: string }>;
}) {
  // De-duplicate by type so connecting two GA4 properties only shows one
  // "Google Analytics" bubble.
  const seen = new Set<string>();
  const uniques = sources.filter((s) => {
    if (seen.has(s.type)) return false;
    seen.add(s.type);
    return true;
  });
  if (uniques.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {uniques.map((s) => {
        const meta = SOURCE_ICON[s.type];
        if (!meta) return null;
        return (
          <span
            key={s.type}
            className="inline-flex items-center gap-2 rounded-full
                       border border-v2-line bg-v2-surface px-3 py-1.5
                       text-[12px] text-v2-ink-muted"
            title={`${meta.label} · connected`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.icon}
              alt=""
              width={14}
              height={14}
              style={{ display: "block" }}
            />
            <span>{meta.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function V1PanelWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-1 overflow-auto min-h-0"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        lineHeight: 1.5,
        color: "var(--text-primary)",
        background: "var(--bg-primary)",
      }}
    >
      {children}
    </div>
  );
}
