export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** When the answer is a specific number, show it in a scorecard first (assistant only) */
  scorecard?: { value: string; label: string };
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

const STORAGE_PREFIX = "meaning_chats_";
const MAX_TITLE_LENGTH = 45;

export function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function getChats(userId: string): StoredChat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChat[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChats(userId: string, chats: StoredChat[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(chats));
  } catch {
    // ignore quota or parse errors
  }
}

export function titleFromFirstMessage(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "New chat";
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_TITLE_LENGTH).trim() + "…";
}
