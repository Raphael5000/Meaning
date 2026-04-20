"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  Mail,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailTagInput } from "@/components/ui/email-tag-input";
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


interface TeamPanelProps {
  onClose: () => void;
  orgId: string | null;
  orgName: string;
}

export default function TeamPanel({ onClose, orgId, orgName }: TeamPanelProps) {
  const [tab, setTab] = useState<"members" | "invite">("members");
  const [orgDetail, setOrgDetail] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedOrgId = orgId;

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

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
    if (selectedOrgId) fetchOrgDetail(selectedOrgId);
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
        setEditingName(false);
        if (orgDetail) setOrgDetail({ ...orgDetail, name: nameValue.trim() });
      }
    } catch {
      setError("Failed to rename account");
    } finally {
      setSavingName(false);
    }
  }

  async function sendInvite() {
    const emails = inviteEmail.split(",").map((e) => e.trim()).filter(Boolean);
    if (emails.length === 0 || !selectedOrgId) return;
    setInviting(true);
    setError(null);
    try {
      for (const email of emails) {
        const res = await fetch(`/api/organizations/${selectedOrgId}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Failed to invite ${email}`);
          return;
        }
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
      await fetch(`/api/organizations/${selectedOrgId}/members/${memberId}`, { method: "DELETE" });
      await fetchOrgDetail(selectedOrgId);
    } catch {
      setError("Failed to remove member");
    }
  }

  // The user can manage the team if they opened this panel — always show admin controls
  const isAdmin = true;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Team</h2>
          <p className="text-xs text-muted-foreground">Manage members for your accounts</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-3">

          {!selectedOrgId ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No account selected. Select an account from the sidebar first.</p>
          ) : (
            <>
              {/* Active account */}
              <div className="rounded-xl border border-border px-4 py-3" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
                <p className="text-[10px] text-muted-foreground">Account</p>
                <p className="text-sm font-medium text-foreground">{orgDetail?.name || orgName}</p>
              </div>

              {/* Edit name */}
              {isAdmin && orgDetail && (
                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveOrgName()}
                        placeholder="Account name"
                        autoFocus
                        className="h-8 text-xs"
                      />
                      <Button size="sm" onClick={saveOrgName} disabled={savingName || !nameValue.trim()} className="h-8 shrink-0 text-xs" style={{ background: "var(--accent)", color: "white" }}>
                        {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingName(false)} className="h-8 shrink-0 text-xs">Cancel</Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setNameValue(orgDetail.name); setEditingName(true); }}
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
                  {(["members", "invite"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  ))}
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
                        <p className="py-4 text-center text-xs text-muted-foreground">No members yet. Send an invite to get started.</p>
                      )}
                      {orgDetail?.memberships?.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
                          {m.user.image ? (
                            <img src={m.user.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                              {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">{m.user.name || m.user.email}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{m.user.email}</p>
                          </div>
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{m.role}</span>
                          {isAdmin && m.userId !== orgDetail?.ownerId && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeMember(m.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}

                      {/* Pending invites */}
                      {isAdmin && orgDetail?.invites && orgDetail.invites.length > 0 && (
                        <>
                          <p className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pending Invites</p>
                          {orgDetail.invites.map((inv) => (
                            <div key={inv.id} className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-foreground">{inv.email}</p>
                                <p className="text-[10px] text-muted-foreground">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* Invite tab */}
                  {tab === "invite" && isAdmin && (
                    <div className="rounded-xl border border-border p-4 space-y-4" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email address</Label>
                        <EmailTagInput
                          value={inviteEmail}
                          onChange={setInviteEmail}
                          placeholder="teammate@company.com"
                        />
                      </div>

                      <p className="text-[10px] text-muted-foreground">
                        This person will get access to <span className="font-medium text-foreground">{orgDetail?.name || orgName}</span> and all its connected data sources.
                      </p>

                      {inviteSuccess && (
                        <p className="flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
                          <Check className="h-3.5 w-3.5" />
                          Invite sent successfully!
                        </p>
                      )}

                      <Button
                        size="sm"
                        onClick={sendInvite}
                        disabled={inviting || !inviteEmail.trim()}
                        className="w-full text-xs"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        {inviting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                        Send Invite
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
