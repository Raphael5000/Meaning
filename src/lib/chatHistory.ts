export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** When the answer is a specific number, show it in a scorecard first (assistant only) */
  scorecard?: { value: string; label: string; change?: string };
  /** True once the scorecard typewriter has finished (so we don't re-stream when returning to chat) */
  scorecardRevealed?: boolean;
  /** Suggested follow-up questions (assistant messages only) */
  suggestedQuestions?: string[];
}

export interface StoredChat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  /** GA4 property used for this chat; restored when switching back to the chat */
  propertyId?: string | null;
  propertyName?: string;
}

const MAX_TITLE_LENGTH = 45;

export function titleFromFirstMessage(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "New chat";
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_TITLE_LENGTH).trim() + "…";
}

// ──────────────────────────────────────────────
// Database-backed chat history API helpers
// ──────────────────────────────────────────────

/** Shape returned by the /api/chats endpoints (DB row with nested messages) */
interface DbChat {
  id: string;
  title: string;
  propertyId: string | null;
  propertyName: string | null;
  createdAt: string; // ISO date string from JSON
  messages: {
    id: string;
    role: string;
    content: string;
    scorecard: { value: string; label: string; change?: string } | null;
    scorecardRevealed: boolean;
    suggestedQuestions: string[] | null;
    sortOrder: number;
  }[];
}

/** Convert a DB chat row into the frontend StoredChat shape */
function toStoredChat(db: DbChat): StoredChat {
  return {
    id: db.id,
    title: db.title,
    createdAt: new Date(db.createdAt).getTime(),
    propertyId: db.propertyId,
    propertyName: db.propertyName ?? undefined,
    messages: db.messages.map((m) => ({
      id: m.id,
      role: m.role as Message["role"],
      content: m.content,
      scorecard: m.scorecard ?? undefined,
      scorecardRevealed: m.scorecardRevealed || undefined,
      suggestedQuestions: m.suggestedQuestions ?? undefined,
    })),
  };
}

/** Convert frontend messages to the API payload shape */
function messagesToPayload(messages: Message[]) {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    scorecard: m.scorecard ?? null,
    scorecardRevealed: m.scorecardRevealed ?? false,
    suggestedQuestions: m.suggestedQuestions,
  }));
}

/** Fetch all chats for the current user from the database */
export async function fetchChats(): Promise<StoredChat[]> {
  try {
    const res = await fetch("/api/chats");
    if (!res.ok) {
      console.error("[chatHistory] fetchChats failed:", res.status, await res.text().catch(() => ""));
      return [];
    }
    const data = (await res.json()) as DbChat[];
    return data.map(toStoredChat);
  } catch (err) {
    console.error("[chatHistory] fetchChats error:", err);
    return [];
  }
}

/** Create a new chat in the database */
export async function createChat(chat: StoredChat): Promise<void> {
  try {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: chat.id,
        title: chat.title,
        propertyId: chat.propertyId ?? null,
        propertyName: chat.propertyName,
        messages: messagesToPayload(chat.messages),
      }),
    });
    if (!res.ok) {
      console.error("[chatHistory] createChat failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[chatHistory] createChat error:", err);
  }
}

/** Update an existing chat in the database (title, property, and/or messages) */
export async function updateChat(chat: StoredChat): Promise<void> {
  try {
    const res = await fetch(`/api/chats/${chat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: chat.title,
        propertyId: chat.propertyId ?? null,
        propertyName: chat.propertyName,
        messages: messagesToPayload(chat.messages),
      }),
    });
    if (!res.ok) {
      console.error("[chatHistory] updateChat failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[chatHistory] updateChat error:", err);
  }
}

/** Delete a chat from the database */
export async function deleteRemoteChat(chatId: string): Promise<void> {
  try {
    const res = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
    if (!res.ok) {
      console.error("[chatHistory] deleteChat failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[chatHistory] deleteChat error:", err);
  }
}
