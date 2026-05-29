"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { I } from "./icons";
import { Avatar, Kbd } from "./primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export interface SidebarChat {
  id: string;
  title: string;
  pinned?: boolean;
  active?: boolean;
  /** Timestamp used for grouping (Today / Yesterday / Older) */
  createdAt: number;
}

export interface SidebarOrg {
  id: string;
  name: string;
  initials: string;
}

export interface SidebarUser {
  name: string;
  planLabel: string;
  initials: string;
  imageUrl?: string | null;
}

interface SidebarProps {
  collapsed?: boolean;
  org?: SidebarOrg | null;
  orgs?: SidebarOrg[];
  chats: SidebarChat[];
  user?: SidebarUser | null;
  alertsBadge?: number;
  connectionErrors?: number;
  activeRoute?: "chat" | "dashboards" | "alerts" | "goals" | "reports" | "connections";
  renamingChatId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  onPinChat?: (chat: SidebarChat) => void;
  onStartRename?: (chat: SidebarChat) => void;
  onDeleteChat?: (chat: SidebarChat) => void;
  onSwitchOrg?: (orgId: string) => void;
  onManageWorkspace?: () => void;
  onCreateTeam?: () => void;
  onOpenDashboards?: () => void;
  onOpenAlerts?: () => void;
  onOpenGoals?: () => void;
  onOpenReports?: () => void;
  onOpenConnections?: () => void;
  onOpenAccount?: () => void;
  accountMenu?: React.ReactNode;
}

export function Sidebar(props: SidebarProps) {
  const { collapsed = false } = props;
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden bg-v2-surface border-r border-v2-line",
        "transition-[width] duration-200 ease-[var(--v2-ease)]",
        collapsed ? "w-14" : "w-[272px]"
      )}
    >
      {collapsed ? <CollapsedContent {...props} /> : <ExpandedContent {...props} />}
    </aside>
  );
}

/* =========================================================================
   COLLAPSED — icon rail
   ========================================================================= */

function CollapsedContent({
  activeRoute = "chat",
  connectionErrors,
  user,
  onNewChat,
  onOpenDashboards,
  onOpenAlerts,
  onOpenGoals,
  onOpenReports,
  onOpenConnections,
  onOpenAccount,
}: SidebarProps) {
  return (
    <>
      <div className="flex flex-col items-center py-3.5">
        <IconBtn
          icon={<I.Edit />}
          label="New chat"
          onClick={onNewChat}
          active={activeRoute === "chat"}
        />
        <IconBtn
          icon={<I.Grid />}
          label="Dashboards"
          onClick={onOpenDashboards}
          active={activeRoute === "dashboards"}
        />
        <IconBtn
          icon={<I.Bell />}
          label="Alerts"
          onClick={onOpenAlerts}
          active={activeRoute === "alerts"}
        />
        <IconBtn
          icon={<I.Target />}
          label="Goals"
          onClick={onOpenGoals}
          active={activeRoute === "goals"}
        />
        <IconBtn
          icon={<I.FileDown />}
          label="Reports"
          onClick={onOpenReports}
          active={activeRoute === "reports"}
        />
        <IconBtn
          icon={<I.Plug />}
          label="Connections"
          onClick={onOpenConnections}
          active={activeRoute === "connections"}
          errorDot={!!connectionErrors}
        />
      </div>
      <div className="flex-1" />
      {user && (
        <div className="p-2">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onOpenAccount}
                aria-label="Account"
                className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink focus-visible:ring-offset-2 focus-visible:ring-offset-v2-surface"
              >
                <Avatar initials={user.initials} size={30} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{user.name}</TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  );
}

function IconBtn({
  icon,
  label,
  active,
  onClick,
  errorDot,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  errorDot?: boolean;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={cn(
            "relative my-0.5 flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink",
            active
              ? "bg-v2-surface-2 text-v2-ink"
              : "text-v2-ink-muted hover:bg-v2-surface-2 hover:text-v2-ink"
          )}
        >
          {icon}
          {errorDot && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/* =========================================================================
   EXPANDED — full sidebar
   ========================================================================= */

function ExpandedContent({
  org,
  orgs,
  chats,
  user,
  alertsBadge,
  connectionErrors,
  activeRoute = "chat",
  renamingChatId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onNewChat,
  onSelectChat,
  onPinChat,
  onStartRename,
  onDeleteChat,
  onSwitchOrg,
  onManageWorkspace,
  onCreateTeam,
  onOpenDashboards,
  onOpenAlerts,
  onOpenGoals,
  onOpenReports,
  onOpenConnections,
  onOpenAccount,
  accountMenu,
}: SidebarProps) {
  const groups = groupChats(chats);
  return (
    <div className="flex h-full flex-col min-w-[272px] pt-3">
      {/* Org switcher */}
      {org && (
        <div className="px-2.5 pb-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center gap-2.5 rounded-lg border border-v2-line bg-v2-surface-2 px-2.5 py-2 text-left transition-colors hover:border-v2-line-strong hover:bg-v2-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink"
              >
                <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] bg-v2-ink text-[10px] font-semibold text-v2-ink-inverse">
                  {org.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-v2-ink">
                    {org.name}
                  </div>
                </div>
                <I.Chevron
                  size={13}
                  className="text-v2-ink-muted group-hover:text-v2-ink"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6} className="w-[252px]">
              <DropdownMenuLabel>Teams</DropdownMenuLabel>
              {(orgs ?? [org]).map((o) => (
                <DropdownMenuItem
                  key={o.id}
                  onSelect={() => onSwitchOrg?.(o.id)}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[4px] bg-v2-ink text-[9px] font-semibold text-v2-ink-inverse">
                      {o.initials}
                    </div>
                    <span className="truncate">{o.name}</span>
                  </span>
                  {o.id === org.id && (
                    <I.Check size={13} className="text-v2-brand" />
                  )}
                </DropdownMenuItem>
              ))}
              {(onCreateTeam || onManageWorkspace) && <DropdownMenuSeparator />}
              {onCreateTeam && (
                <DropdownMenuItem onSelect={onCreateTeam}>
                  <I.Plus />
                  Create new team
                </DropdownMenuItem>
              )}
              {onManageWorkspace && (
                <DropdownMenuItem onSelect={onManageWorkspace}>
                  <I.Users />
                  Manage team
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Primary nav */}
      <nav className="px-2.5 pb-2">
        <NavLink
          icon={<I.Edit size={14} />}
          label="New chat"
          shortcut={<Kbd>⌘N</Kbd>}
          active={activeRoute === "chat"}
          onClick={onNewChat}
        />
        <NavLink
          icon={<I.Grid size={14} />}
          label="Dashboards"
          active={activeRoute === "dashboards"}
          onClick={onOpenDashboards}
        />
        <NavLink
          icon={<I.Bell size={14} />}
          label="Alerts"
          badge={alertsBadge ? String(alertsBadge) : undefined}
          active={activeRoute === "alerts"}
          onClick={onOpenAlerts}
        />
        <NavLink
          icon={<I.Target size={14} />}
          label="Goals"
          active={activeRoute === "goals"}
          onClick={onOpenGoals}
        />
        <NavLink
          icon={<I.FileDown size={14} />}
          label="Reports"
          active={activeRoute === "reports"}
          onClick={onOpenReports}
        />
        <NavLink
          icon={<I.Plug size={14} />}
          label="Connections"
          active={activeRoute === "connections"}
          onClick={onOpenConnections}
          errorDot={!!connectionErrors}
        />
      </nav>

      <div className="mx-2.5 my-1.5 border-t border-v2-line" />

      {/* Chat list — pinned first, everything else flows below as a flat list */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2">
        {groups.pinned.length > 0 && (
          <ChatGroup
            label="Pinned"
            items={groups.pinned}
            pinned
            onSelect={onSelectChat}
            onPin={onPinChat}
            onStartRename={onStartRename}
            onDelete={onDeleteChat}
            renamingChatId={renamingChatId}
            renameValue={renameValue}
            onRenameChange={onRenameChange}
            onRenameSubmit={onRenameSubmit}
            onRenameCancel={onRenameCancel}
          />
        )}
        {groups.recent.length > 0 && (
          <div className={groups.pinned.length > 0 ? "mt-1" : ""}>
            {groups.recent.map((item) => (
              <ChatRow
                key={item.id}
                chat={item}
                onSelect={onSelectChat}
                onPin={onPinChat}
                onStartRename={onStartRename}
                onDelete={onDeleteChat}
                isRenaming={renamingChatId === item.id}
                renameValue={renameValue}
                onRenameChange={onRenameChange}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
              />
            ))}
          </div>
        )}
        {chats.length === 0 && (
          <p className="px-1.5 py-2 text-xs text-v2-ink-muted">No chats yet</p>
        )}
      </div>

      {/* Account row */}
      {user && (
        <div className="border-t border-v2-line p-2.5">
          {accountMenu ? (
            accountMenu
          ) : (
            <button
              type="button"
              onClick={onOpenAccount}
              className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-v2-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink"
            >
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt=""
                  className="h-[30px] w-[30px] shrink-0 rounded-md object-cover"
                />
              ) : (
                <Avatar initials={user.initials} size={30} />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium text-v2-ink">
                  {user.name}
                </div>
                <div className="text-[10.5px] text-v2-ink-muted">
                  {user.planLabel}
                </div>
              </div>
              <I.Chevron size={13} className="rotate-180 text-v2-ink-muted" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NavLink({
  icon,
  label,
  shortcut,
  badge,
  active,
  onClick,
  errorDot,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: React.ReactNode;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
  errorDot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative my-0.5 flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-1.5 text-left text-[13px] text-v2-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink",
        active
          ? "bg-v2-surface-2 font-semibold"
          : "font-normal hover:bg-v2-surface-2"
      )}
    >
      {active && (
        <span className="absolute left-0.5 top-1.5 bottom-1.5 w-0.5 rounded-sm bg-v2-ink" />
      )}
      <span className="relative inline-flex text-v2-ink-muted">
        {icon}
        {errorDot && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full border border-v2-line bg-v2-surface-2 px-1.5 py-px text-[10px] text-v2-ink-muted">
          {badge}
        </span>
      )}
      {shortcut && !badge && <span className="opacity-60">{shortcut}</span>}
    </button>
  );
}

interface ChatGroupProps {
  label: string;
  items: SidebarChat[];
  pinned?: boolean;
  onSelect?: (id: string) => void;
  onPin?: (chat: SidebarChat) => void;
  onStartRename?: (chat: SidebarChat) => void;
  onDelete?: (chat: SidebarChat) => void;
  renamingChatId?: string | null;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
}

function ChatGroup({
  label,
  items,
  pinned,
  onSelect,
  onPin,
  onStartRename,
  onDelete,
  renamingChatId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: ChatGroupProps) {
  return (
    <div className="mb-3.5">
      <div className="flex items-center gap-1.5 px-1.5 pt-1 pb-1.5">
        <span className="kicker text-[9.5px]">{label}</span>
        <div className="mt-px flex-1 border-t border-v2-line" />
      </div>
      {items.map((item) => (
        <ChatRow
          key={item.id}
          chat={item}
          pinned={pinned}
          onSelect={onSelect}
          onPin={onPin}
          onStartRename={onStartRename}
          onDelete={onDelete}
          isRenaming={renamingChatId === item.id}
          renameValue={renameValue}
          onRenameChange={onRenameChange}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
        />
      ))}
    </div>
  );
}

function ChatRow({
  chat,
  pinned,
  onSelect,
  onPin,
  onStartRename,
  onDelete,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: {
  chat: SidebarChat;
  pinned?: boolean;
  onSelect?: (id: string) => void;
  onPin?: (chat: SidebarChat) => void;
  onStartRename?: (chat: SidebarChat) => void;
  onDelete?: (chat: SidebarChat) => void;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (isRenaming) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [isRenaming]);

  return (
    <div
      className={cn(
        "group relative my-px flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] transition-colors",
        chat.active ? "bg-v2-surface-2" : "hover:bg-v2-surface-2"
      )}
    >
      {chat.active && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-sm bg-v2-ink" />
      )}
      {pinned && <I.Pin size={11} className="shrink-0 text-v2-ink-subtle" />}
      {isRenaming ? (
        <input
          ref={inputRef}
          value={renameValue ?? ""}
          onChange={(e) => onRenameChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onRenameSubmit?.();
            if (e.key === "Escape") onRenameCancel?.();
          }}
          onBlur={onRenameSubmit}
          onClick={(e) => e.stopPropagation()}
          className="no-focus-ring min-w-0 flex-1 rounded bg-v2-surface-3 px-1.5 py-0.5 text-[12.5px] text-v2-ink outline-none ring-1 ring-v2-line-strong"
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelect?.(chat.id)}
          className={cn(
            "min-w-0 flex-1 truncate text-left focus:outline-none",
            chat.active ? "font-medium text-v2-ink" : "text-v2-ink"
          )}
          title={chat.title}
        >
          {chat.title}
        </button>
      )}
      {!isRenaming && (onPin || onStartRename || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Chat options"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 rounded p-1 text-v2-ink-muted opacity-0 transition-opacity hover:bg-v2-surface-3 hover:text-v2-ink group-hover:opacity-100 data-[state=open]:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v2-ink"
            >
              <I.More size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" sideOffset={4}>
            {onPin && (
              <DropdownMenuItem onSelect={() => onPin(chat)}>
                <I.Pin />
                {chat.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
            )}
            {onStartRename && (
              <DropdownMenuItem onSelect={() => onStartRename(chat)}>
                <I.Edit />
                Rename
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => onDelete(chat)}>
                  <I.Trash />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface GroupedChats {
  pinned: SidebarChat[];
  recent: SidebarChat[];
}

function groupChats(chats: SidebarChat[]): GroupedChats {
  const pinned: SidebarChat[] = [];
  const recent: SidebarChat[] = [];

  const sorted = [...chats].sort((a, b) => b.createdAt - a.createdAt);
  for (const c of sorted) {
    if (c.pinned) pinned.push(c);
    else recent.push(c);
  }
  return { pinned, recent };
}
