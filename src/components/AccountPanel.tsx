"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  teamMembership: {
    role: string;
    teamName: string;
    adminName: string;
  } | null;
}

interface AccountPanelProps {
  onClose: () => void;
}

export default function AccountPanel({ onClose }: AccountPanelProps) {
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"profile" | "subscription">("profile");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/user/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || "");
    }
  }, []);

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, [fetchProfile]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) {
        await fetchProfile();
        setMessage("Profile updated");
      }
    } catch {
      setMessage("Failed to update profile");
    }
    setSaving(false);
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/user/billing-portal");
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, "_blank");
        }
      } else {
        setMessage("Unable to open billing portal. Please try again.");
      }
    } catch {
      setMessage("Unable to open billing portal. Please try again.");
    }
    setPortalLoading(false);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Failed to load profile</p>
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
          <h2 className="text-sm font-semibold text-foreground">Account</h2>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border px-6 py-2">
        {(["profile", "subscription"] as const).map((key) => (
          <button
            key={key}
            onClick={() => { setTab(key); setMessage(""); }}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === key ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div
          className="mx-6 mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{
            background: "rgba(16, 163, 127, 0.08)",
            color: "var(--accent)",
          }}
        >
          {message}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-2xl space-y-4">

          {/* Profile Tab */}
          {tab === "profile" && (
            <>
              {/* Profile info */}
              <div className="rounded-xl border border-border p-4" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile Information</h3>
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Member since</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(profile.createdAt).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={saving}
                    size="sm"
                    className="mt-1 w-fit text-xs"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                </form>
              </div>

              {/* Appearance */}
              <div className="rounded-xl border border-border p-4" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h3>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "light" as const, label: "Light" },
                    { value: "dark" as const, label: "Dark" },
                    { value: "system" as const, label: "System" },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`cursor-pointer rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        theme === value
                          ? "border-[var(--accent)] bg-[rgba(16,163,127,0.08)] text-[var(--accent)]"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legal */}
              <div className="rounded-xl border border-border p-4" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</h3>
                <div className="space-y-1.5">
                  <Link href="/terms" className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-accent/5">
                    Terms and Conditions
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><polyline points="9 18 15 12 9 6" /></svg>
                  </Link>
                  <Link href="/privacy" className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-xs text-foreground transition-colors hover:bg-accent/5">
                    Privacy Policy
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><polyline points="9 18 15 12 9 6" /></svg>
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Subscription Tab */}
          {tab === "subscription" && (
            <div className="rounded-xl border border-border p-4" style={{ background: "var(--card-bg, var(--bg-secondary, transparent))" }}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</h3>

              {profile.teamMembership ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Your account is managed by <span className="font-medium text-foreground">{profile.teamMembership.adminName}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Team: {profile.teamMembership.teamName}</p>
                </div>
              ) : profile.subscription ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: profile.subscription.status === "active" ? "rgba(16, 163, 127, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: profile.subscription.status === "active" ? "var(--accent)" : "var(--error, #ef4444)",
                      }}
                    >
                      {profile.subscription.status === "active"
                        ? profile.subscription.cancelAtPeriodEnd ? "Cancelling" : "Active"
                        : profile.subscription.status.charAt(0).toUpperCase() + profile.subscription.status.slice(1)}
                    </span>
                    {profile.subscription.cancelAtPeriodEnd && (
                      <span className="text-[10px] text-muted-foreground">
                        Access until {new Date(profile.subscription.currentPeriodEnd).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Manage your subscription, update payment methods, view invoices, and download receipts through the billing portal.
                  </p>

                  <Button
                    size="sm"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="w-fit gap-2 text-xs"
                    style={{ background: "var(--accent)", color: "white" }}
                  >
                    {portalLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3 w-3" />
                    )}
                    Manage billing
                  </Button>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="mb-3 text-xs text-muted-foreground">No active subscription.</p>
                  <Link href="/pricing" className="text-xs font-medium" style={{ color: "var(--accent)" }}>View pricing</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
