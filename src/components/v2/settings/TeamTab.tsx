"use client";

import * as React from "react";
import { Loader2, Mail, MoreHorizontal, Trash2 } from "lucide-react";

import { Section } from "../layout/Section";
import { FieldRow } from "../layout/FieldRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface OrgMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface OrgInvite {
  id: string;
  email: string;
  expiresAt: string;
}

interface OrgData {
  id: string;
  name: string;
  ownerId: string;
  memberships: OrgMember[];
  invites: OrgInvite[];
}

interface TeamTabProps {
  orgId: string | null;
  orgName: string;
  onClose?: () => void;
}

/**
 * Team tab. Preserves all behaviors from the legacy TeamPanel:
 * - Rename workspace (PUT /api/organizations/:id)
 * - Invite members (POST /api/organizations/:id/invite, supports
 *   comma-separated emails)
 * - Remove members (DELETE /api/organizations/:id/members/:memberId)
 *
 * Reorganised into the design's Workspace / People sections, with a
 * shadcn Table for the members list.
 */
export function TeamTab({ orgId, orgName }: TeamTabProps) {
  const [org, setOrg] = React.useState<OrgData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Rename workspace
  const [renaming, setRenaming] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  const [inviteSuccess, setInviteSuccess] = React.useState(false);

  const fetchOrg = React.useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/organizations/${id}`);
        if (res.ok) {
          const data = (await res.json()) as { organization: OrgData };
          setOrg(data.organization);
        } else {
          setError("Failed to load workspace");
        }
      } catch {
        setError("Failed to load workspace");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (orgId) fetchOrg(orgId);
  }, [orgId, fetchOrg]);

  async function saveName() {
    if (!orgId || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      if (res.ok) {
        setRenaming(false);
        if (org) setOrg({ ...org, name: nameDraft.trim() });
      } else {
        setError("Failed to rename workspace");
      }
    } catch {
      setError("Failed to rename workspace");
    } finally {
      setSavingName(false);
    }
  }

  async function sendInvite() {
    if (!orgId) return;
    const emails = inviteEmail
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    setInviting(true);
    setError(null);
    try {
      for (const email of emails) {
        const res = await fetch(`/api/organizations/${orgId}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(data.error || `Failed to invite ${email}`);
          return;
        }
      }
      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
      await fetchOrg(orgId);
    } catch {
      setError("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(membershipId: string) {
    if (!orgId) return;
    try {
      const res = await fetch(
        `/api/organizations/${orgId}/members/${membershipId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        await fetchOrg(orgId);
      } else {
        setError("Failed to remove member");
      }
    } catch {
      setError("Failed to remove member");
    }
  }

  if (!orgId) {
    return (
      <p className="py-12 text-center text-[13px] text-muted-foreground">
        Select an account from the sidebar first.
      </p>
    );
  }

  if (loading && !org) {
    return <TeamSkeleton />;
  }

  if (!org) {
    return (
      <p className="py-12 text-center text-[13px] text-muted-foreground">
        Couldn’t load workspace details.
      </p>
    );
  }

  const owner = org.memberships.find((m) => m.userId === org.ownerId);
  const memberCount = org.memberships.length;

  return (
    <div className="pt-6 pb-12">
      <header className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
          {org.name}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {memberCount} member{memberCount === 1 ? "" : "s"} · Owner:{" "}
          {owner?.user.name || owner?.user.email || "—"}
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      )}

      <Section title="Workspace">
        <FieldRow
          label="Name"
          value={
            renaming ? (
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setRenaming(false);
                    setNameDraft(org.name);
                  }
                }}
                autoFocus
                className="h-8 text-[13px]"
              />
            ) : (
              org.name
            )
          }
          action={
            renaming ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRenaming(false);
                    setNameDraft(org.name);
                  }}
                  disabled={savingName}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveName}
                  disabled={savingName || !nameDraft.trim()}
                >
                  {savingName ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNameDraft(org.name);
                  setRenaming(true);
                }}
              >
                Edit
              </Button>
            )
          }
        />
        <FieldRow
          label="Owner"
          value={
            owner ? (
              <>
                <span className="font-medium text-foreground">
                  {owner.user.name || owner.user.email}
                </span>
                {owner.user.name && (
                  <span className="ml-1 text-muted-foreground">
                    · {owner.user.email}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Unknown</span>
            )
          }
        />
        <FieldRow
          label="Members"
          value={
            <span className="tabular-nums">
              {memberCount} of unlimited
            </span>
          }
          last
        />
      </Section>

      <Section
        title="People"
        wrap={false}
        action={
          <div className="flex items-center gap-2">
            <div className="flex h-[30px] items-center gap-1.5 rounded-md border border-border pl-2.5 pr-1 transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/25">
              <Mail className="size-3 text-muted-foreground" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendInvite();
                }}
                placeholder="invite teammate@hivory.io"
                className="no-focus-ring w-[220px] border-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              />
              <Button
                size="sm"
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="h-[22px] px-2.5 text-[11.5px]"
              >
                {inviting ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  "Invite"
                )}
              </Button>
            </div>
          </div>
        }
      >
        {inviteSuccess && (
          <div className="mb-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[12.5px] text-primary">
            Invite sent.
          </div>
        )}

        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Access</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.memberships.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7 text-[10px]">
                        {m.user.image && (
                          <AvatarImage src={m.user.image} alt="" />
                        )}
                        <AvatarFallback>
                          {(m.user.name || m.user.email)
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 leading-tight">
                        <div className="truncate text-[13px] font-medium">
                          {m.user.name || m.user.email}
                        </div>
                        {m.user.name && (
                          <div className="truncate text-[11.5px] text-muted-foreground">
                            {m.user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-[12.5px]">{m.role}</span>
                      {m.userId === org.ownerId && (
                        <Badge variant="outline">Owner</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.userId !== org.ownerId ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => removeMember(m.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}

              {org.invites.map((inv) => (
                <TableRow key={inv.id} className="opacity-70">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7 text-[10px]">
                        <AvatarFallback>
                          <Mail className="size-3 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 leading-tight">
                        <div className="truncate text-[13px] text-muted-foreground">
                          {inv.email}
                        </div>
                        <div className="truncate text-[11.5px] text-muted-foreground">
                          Expires{" "}
                          {new Date(inv.expiresAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Invited</Badge>
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}

              {org.memberships.length === 0 && org.invites.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-[13px] text-muted-foreground"
                  >
                    No members yet. Send an invite to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-6 pt-6">
      <Skeleton className="h-7 w-[200px]" />
      <Skeleton className="h-4 w-[260px]" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-5 w-[100px]" />
        <Skeleton className="h-[160px] w-full rounded-lg" />
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton className="h-5 w-[100px]" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    </div>
  );
}
