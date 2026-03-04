"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Trash2,
  Send,
  Users,
  Mail,
  X,
  Check,
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

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  properties: string[];
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface TeamInvite {
  id: string;
  email: string;
  properties: string[];
  expiresAt: string;
}

interface TeamData {
  id: string;
  name: string;
  ownerId: string;
  memberships: TeamMember[];
  invites: TeamInvite[];
}

interface SeatData {
  total: number;
  activeMembers: number;
  pendingInvites: number;
}

interface GA4Property {
  propertyId: string;
  displayName: string;
  account: string;
}

export default function TeamModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"members" | "invite">("members");
  const [team, setTeam] = useState<TeamData | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [seats, setSeats] = useState<SeatData | null>(null);
  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);


  const fetchTeam = useCallback(async () => {
    try {
      const [teamRes, seatsRes, propsRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/team/seats"),
        fetch("/api/analytics/properties"),
      ]);

      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeam(data.team);
        setRole(data.role);
      }

      if (seatsRes.ok) {
        setSeats(await seatsRes.json());
      }

      if (propsRes.ok) {
        const data = await propsRes.json();
        setProperties(data.properties || []);
      }
    } catch {
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      fetchTeam();
    }
  }, [open, fetchTeam]);

  async function createTeam() {
    setLoading(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Team" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create team");
        return;
      }
      await fetchTeam();
    } catch {
      setError("Failed to create team");
    } finally {
      setLoading(false);
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          properties: selectedProperties,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send invite");
        return;
      }

      setInviteEmail("");
      setSelectedProperties([]);
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
      await fetchTeam();
    } catch {
      setError("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(inviteId: string) {
    try {
      await fetch("/api/team/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      await fetchTeam();
    } catch {
      setError("Failed to revoke invite");
    }
  }

  async function removeMember(memberId: string) {
    try {
      await fetch(`/api/team/members/${memberId}`, { method: "DELETE" });
      await fetchTeam();
    } catch {
      setError("Failed to remove member");
    }
  }

  async function updateMemberProperties(memberId: string, props: string[]) {
    try {
      await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: props }),
      });
      await fetchTeam();
    } catch {
      setError("Failed to update member properties");
    }
  }

  function toggleProperty(propId: string) {
    setSelectedProperties((prev) =>
      prev.includes(propId) ? prev.filter((p) => p !== propId) : [...prev, propId]
    );
  }

  const isAdmin = role === "admin";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
          </DialogTitle>
          <DialogDescription>
            Manage your team members and seat allocation.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !team ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              Create a team to invite members and share analytics access.
            </p>
            <Button onClick={createTeam}>Create Team</Button>
          </div>
        ) : (
          <>
            {/* Seats summary */}
            {seats && isAdmin && (
              <div
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--border-color)" }}
              >
                <p className="text-sm font-medium text-foreground">
                  {seats.total} seat{seats.total !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {seats.activeMembers} member{seats.activeMembers !== 1 ? "s" : ""}, {seats.pendingInvites} pending invite{seats.pendingInvites !== 1 ? "s" : ""}
                </p>
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

            {/* Members tab */}
            {tab === "members" && (
              <div className="space-y-2">
                {/* Team members */}
                {team.memberships?.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No team members yet. Send an invite to get started.
                  </p>
                )}
                {team.memberships?.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {m.user.name || m.user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.user.email}
                      </p>
                      {m.properties.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {m.properties.map((pid) => {
                            const prop = properties.find((p) => p.propertyId === pid);
                            return (
                              <span
                                key={pid}
                                className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {prop?.displayName || pid}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
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
                {isAdmin && team.invites && team.invites.length > 0 && (
                  <>
                    <p className="pt-2 text-xs font-medium text-muted-foreground">
                      Pending Invites
                    </p>
                    {team.invites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 rounded-lg border border-dashed p-3"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {inv.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Expires {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => revokeInvite(inv.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
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
                  />
                </div>

                {properties.length > 0 && (
                  <div className="space-y-2">
                    <Label>GA4 Properties (optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Select which properties this member can access. Leave empty for no access until updated.
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2" style={{ borderColor: "var(--border-color)" }}>
                      {properties.map((prop) => (
                        <button
                          key={prop.propertyId}
                          type="button"
                          onClick={() => toggleProperty(prop.propertyId)}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              selectedProperties.includes(prop.propertyId)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            }`}
                          >
                            {selectedProperties.includes(prop.propertyId) && (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                          <span className="truncate">{prop.displayName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {inviteSuccess && (
                  <p className="text-sm" style={{ color: "var(--accent)" }}>
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
      </DialogContent>
    </Dialog>
  );
}
