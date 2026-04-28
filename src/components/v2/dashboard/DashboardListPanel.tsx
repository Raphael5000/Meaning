"use client";

import * as React from "react";
import { Grid, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Page, PageBody, PageHeader } from "../layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSummary {
  id: string;
  title: string;
  dateRange: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: { widgets: number };
}

interface DashboardListPanelV2Props {
  /** Provided by ChatV2 for symmetry with other panels; currently unused
   *  because the AppShell sidebar handles navigation. */
  onClose?: () => void;
  onOpenDashboard: (id: string) => void;
  orgId: string | null;
  orgName?: string;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Dashboard list — shadcn Table version. One row per dashboard with
 * widget count, last-updated, and a delete kebab. Click a row to open
 * the DashboardPanel (untouched widget renderer).
 */
export default function DashboardListPanelV2({
  onOpenDashboard,
  orgId,
  orgName,
}: DashboardListPanelV2Props) {
  const [dashboards, setDashboards] = React.useState<DashboardSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const fetchDashboards = React.useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    fetch(`/api/dashboards?orgId=${orgId}`)
      .then((r) => r.json())
      .then((data) => setDashboards(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Could not load dashboards."))
      .finally(() => setLoading(false));
  }, [orgId]);

  React.useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  async function handleCreate() {
    if (!orgId) {
      toast.error("Select a team first.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, title: "Untitled Dashboard" }),
      });
      if (res.ok) {
        const dashboard = await res.json();
        onOpenDashboard(dashboard.id);
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(data.error || `Could not create dashboard (${res.status}).`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create dashboard.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (
      !window.confirm(
        `Delete "${title || "Untitled Dashboard"}"? This can’t be undone.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/dashboards/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDashboards((prev) => prev.filter((d) => d.id !== id));
        toast.success("Dashboard deleted.");
      } else {
        toast.error("Could not delete dashboard.");
      }
    } catch {
      toast.error("Could not delete dashboard.");
    }
  }

  return (
    <Page className="meaning-v2">
      <PageHeader
        breadcrumb={["Dashboards"]}
        actions={
          <Button
            size="sm"
            disabled={creating || !orgId}
            onClick={handleCreate}
          >
            <Plus className="size-3.5" />
            {creating ? "Creating…" : "New dashboard"}
          </Button>
        }
      />

      <PageBody contained="default" padding="default">
        <header className="mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
            {orgName ? `${orgName} dashboards` : "Dashboards"}
          </h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Pinned widgets and chats. Click a dashboard to open it.
          </p>
        </header>

        {loading ? (
          <DashboardListSkeleton />
        ) : dashboards.length === 0 ? (
          <DashboardListEmpty
            onCreate={handleCreate}
            creating={creating}
            disabled={!orgId}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dashboard</TableHead>
                  <TableHead className="w-[140px]">Widgets</TableHead>
                  <TableHead className="w-[160px]">Updated</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboards.map((d) => (
                  <DashboardRow
                    key={d.id}
                    dashboard={d}
                    onOpen={() => onOpenDashboard(d.id)}
                    onDelete={() => handleDelete(d.id, d.title)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </Page>
  );
}

function DashboardRow({
  dashboard,
  onOpen,
  onDelete,
}: {
  dashboard: DashboardSummary;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow onClick={onOpen} className="cursor-pointer">
      <TableCell>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
            <Grid className="size-3.5" />
          </div>
          <span className="truncate text-[13px] font-medium text-foreground">
            {dashboard.title || "Untitled Dashboard"}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-[12.5px] tabular-nums text-muted-foreground">
        {dashboard._count.widgets} widget
        {dashboard._count.widgets === 1 ? "" : "s"}
      </TableCell>
      <TableCell className="text-[12.5px] text-muted-foreground">
        {relativeDate(dashboard.updatedAt)}
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
            <DropdownMenuItem
              onSelect={onDelete}
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

function DashboardListEmpty({
  onCreate,
  creating,
  disabled,
}: {
  onCreate: () => void;
  creating: boolean;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        <Grid className="size-5" />
      </div>
      <h2 className="mb-1.5 text-[18px] font-semibold tracking-[-0.015em] text-foreground">
        No dashboards yet
      </h2>
      <p className="mx-auto mb-6 max-w-[420px] text-[13px] leading-[1.55] text-muted-foreground">
        Create a dashboard to pin widgets and chats from your connected data.
      </p>
      <Button onClick={onCreate} disabled={creating || disabled}>
        <Plus className="size-3.5" />
        {creating ? "Creating…" : "Create your first dashboard"}
      </Button>
    </div>
  );
}

function DashboardListSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-3 py-2.5">
        <Skeleton className="h-3 w-[100px]" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0"
        >
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-3 w-[200px] flex-1 max-w-[260px]" />
          <Skeleton className="h-3 w-[80px]" />
          <Skeleton className="h-3 w-[100px]" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}
