"use client";

import * as React from "react";
import { MoreHorizontal, Pause, Play, Trash2 } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { dbToUi, summarizeSchedule } from "./schedule";
import { ALERT_TYPE_LABEL, type AlertSummary } from "./types";
import { cn } from "@/lib/utils";

interface AlertsListProps {
  alerts: AlertSummary[];
  loading?: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

/**
 * Alerts table — one row per alert. Pulse + name (with template label
 * underneath) + schedule + next send + recipient stack + kebab.
 *
 * Rows are clickable; the kebab menu stops propagation so toggling /
 * deleting doesn't open the edit sheet.
 */
export function AlertsList({
  alerts,
  loading = false,
  onOpen,
  onToggle,
  onDelete,
}: AlertsListProps) {
  if (loading) {
    return <AlertsListSkeleton />;
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-6 py-16 text-center">
        <p className="text-[14px] font-medium text-foreground">
          No alerts yet.
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Create one to start getting reports in your inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28px]" />
            <TableHead>Alert</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Next</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead className="w-[40px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onOpen={() => onOpen(alert.id)}
              onToggle={() => onToggle(alert.id, !alert.enabled)}
              onDelete={() => onDelete(alert.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AlertRow({
  alert,
  onOpen,
  onToggle,
  onDelete,
}: {
  alert: AlertSummary;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const ui = dbToUi({
    sendDays: alert.sendDays,
    sendHour: alert.sendHour,
    sendMinute: alert.sendMinute,
    intervalWeeks: alert.intervalWeeks,
  });
  const recipients = alert.recipients
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  const template = ALERT_TYPE_LABEL[alert.alertType] ?? "Custom";
  const nextSend = alert.enabled ? formatNextSend(alert) : "—";

  return (
    <TableRow
      onClick={onOpen}
      className={cn(
        "cursor-pointer",
        !alert.enabled && "opacity-60",
      )}
    >
      <TableCell>
        <span
          aria-label={alert.enabled ? "Active" : "Paused"}
          className={cn(
            "inline-block size-[7px] rounded-full",
            alert.enabled ? "bg-primary" : "bg-muted-foreground",
          )}
        />
      </TableCell>
      <TableCell>
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-medium text-foreground">
            {alert.name || "Untitled alert"}
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            {template}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-[12.5px] text-muted-foreground">
        {summarizeSchedule(ui)}
      </TableCell>
      <TableCell className="text-[12.5px] tabular-nums text-muted-foreground">
        {nextSend}
      </TableCell>
      <TableCell>
        <RecipientStack emails={recipients} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onSelect={onToggle}>
              {alert.enabled ? (
                <>
                  <Pause className="size-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Resume
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                if (
                  window.confirm(
                    `Delete "${alert.name || "this alert"}"? This can’t be undone.`,
                  )
                ) {
                  onDelete();
                }
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function RecipientStack({ emails }: { emails: string[] }) {
  if (emails.length === 0) {
    return (
      <span className="text-[12px] text-muted-foreground">No recipients</span>
    );
  }
  const visible = emails.slice(0, 3);
  const overflow = emails.length - visible.length;
  return (
    <div className="flex items-center" title={emails.join(", ")}>
      {visible.map((email, i) => (
        <Avatar
          key={email}
          className={cn(
            "size-6 ring-2 ring-card text-[9px]",
            i > 0 && "-ml-2",
          )}
        >
          <AvatarFallback>{email.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
          +{overflow}
        </span>
      )}
    </div>
  );
}

function AlertsListSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-3 py-2.5">
        <Skeleton className="h-3 w-[80px]" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0"
        >
          <Skeleton className="size-2 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-[180px]" />
            <Skeleton className="h-2.5 w-[100px]" />
          </div>
          <Skeleton className="h-3 w-[120px]" />
          <Skeleton className="h-3 w-[60px]" />
          <Skeleton className="size-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Next-send calculator — kept in this file (was inline in old AlertsIndex). */
/* ------------------------------------------------------------------------- */

function formatNextSend(alert: AlertSummary): string {
  const now = new Date();
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const targetDays = alert.sendDays
    .map((d) => dayMap[d])
    .filter((d): d is number => d !== undefined)
    .sort((a, b) => a - b);
  if (targetDays.length === 0) return "—";

  const today = now.getDay();
  const hour = alert.sendHour;
  const minute = alert.sendMinute;
  let targetDay = targetDays.find((d) => d > today);
  if (targetDay === undefined) {
    targetDay = targetDays[0];
  } else if (targetDay === today) {
    const stillToday =
      now.getHours() < hour ||
      (now.getHours() === hour && now.getMinutes() < minute);
    if (!stillToday) {
      const next = targetDays.find((d) => d > today);
      targetDay = next ?? targetDays[0];
    }
  }

  const daysUntil =
    targetDay >= today ? targetDay - today : 7 - today + targetDay;
  const date = new Date(now);
  date.setDate(now.getDate() + daysUntil);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
