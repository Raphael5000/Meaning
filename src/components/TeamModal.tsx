"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Pencil,
  Trash2,
  Send,
  Users,
  Mail,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OrgMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string; image: string | null };
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

interface OrgListItem {
  id: string;
  name: string;
  imageUrl: string | null;
  ownerId: string;
  role: string;
}

export default function TeamModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"members" | "invite">("members");
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgDetail, setOrgDetail] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        const list = data.organizations || [];
        setOrgs(list);
        if (list.length > 0 && !selectedOrgId) {
          setSelectedOrgId(list[0].id);
        }
      }
    } catch {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

  const fetchOrgDetail = useCallback(async (orgId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setOrgDetail(data.organization);
      }
    } catch {
      setError("Failed to load account details");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      fetchOrgs();
    }
  }, [open, fetchOrgs]);

  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgDetail(selectedOrgId);
    }
  }, [selectedOrgId, fetchOrgDetail]);

  async function saveOrgName() {
    if (!selectedOrgId || !nameValue.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/organizations/${selectedOrgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      if (res.ok) {
        setOrgs((prev) =>
          prev.map((o) => (o.id === selectedOrgId ? { ...o, name: nameValue.trim() } : o))
        );
        setEditingName(false);
      }
    } catch {
      setError("Failed to rename account");
    } finally {
      setSavingName(false);
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !selectedOrgId) return;
    setInviting(true);
    setError(null);

    try {
      const res = await fetch(`/api/organizations/${selectedOrgId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send invite");
        return;
      }

      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
      await fetchOrgDetail(selectedOrgId);
    } catch {
      setError("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!selectedOrgId) return;
    try {
      await fetch(`/api/organizations/${selectedOrgId}/members/${memberId}`, {
        method: "DELETE",
      });
      await fetchOrgDetail(selectedOrgId);
    } catch {
      setError("Failed to remove member");
    }
  }

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);
  const isAdmin = selectedOrg?.role === "admin";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
          </DialogTitle>
          <DialogDescription>
            Manage members for your accounts.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orgs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No accounts found. Create an account first.
            </p>
          </div>
        ) : (
          <>
            {/* Account selector */}
            {orgs.length > 1 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Account</Label>
                <div className="relative">
                  <select
                    value={selectedOrgId || ""}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                  >
                    {orgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}

            {orgs.length === 1 && (
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">{selectedOrg?.name}</p>
              </div>
            )}

            {/* Edit name */}
            {isAdmin && selectedOrg && (
              <div>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveOrgName()}
                      placeholder="Account name"
                      autoFocus
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={saveOrgName}
                      disabled={savingName || !nameValue.trim()}
                      className="h-8 shrink-0 text-xs"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingName(false)}
                      className="h-8 shrink-0 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setNameValue(selectedOrg.name); setEditingName(true); }}
                    className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                    Rename account
                  </button>
                )}
              </div>
            )}

            {/* Tabs */}
            {isAdmin && (
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setTab("members")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === "members"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Members
                </button>
                <button
                  type="button"
                  onClick={() => setTab("invite")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === "invite"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Invite
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Members tab */}
                {tab === "members" && (
                  <div className="space-y-2">
                    {orgDetail?.memberships?.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No members yet. Send an invite to get started.
                      </p>
                    )}
                    {orgDetail?.memberships?.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 rounded-lg border p-3"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        {m.user.image ? (
                          <img src={m.user.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                            {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {m.user.name || m.user.email}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.user.email}
                          </p>
                        </div>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {m.role}
                        </span>
                        {isAdmin && m.userId !== orgDetail?.ownerId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMember(m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {/* Pending invites */}
                    {isAdmin && orgDetail?.invites && orgDetail.invites.length > 0 && (
                      <>
                        <p className="pt-2 text-xs font-medium text-muted-foreground">
                          Pending Invites
                        </p>
                        {orgDetail.invites.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center gap-3 rounded-lg border border-dashed p-3"
                            style={{ borderColor: "var(--border-color)" }}
                          >
                            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-foreground">{inv.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Expires {new Date(inv.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* Invite tab */}
                {tab === "invite" && isAdmin && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="teammate@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      This person will get access to <span className="font-medium text-foreground">{selectedOrg?.name}</span> and all its connected data sources.
                    </p>

                    {inviteSuccess && (
                      <p className="flex items-center gap-1 text-sm" style={{ color: "var(--accent)" }}>
                        <Check className="h-3.5 w-3.5" />
                        Invite sent successfully!
                      </p>
                    )}

                    <Button
                      onClick={sendInvite}
                      disabled={inviting || !inviteEmail.trim()}
                      className="w-full"
                    >
                      {inviting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send Invite
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
