"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, Loader2 } from "lucide-react";

import { Section } from "../layout/Section";
import { FieldRow } from "../layout/FieldRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

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

interface TierStatus {
  tier: "free" | "paid";
  sourceCount: number;
  sourceLimit: number;
  messageUsage: {
    used: number;
    limit: number;
    resetsAt: string;
    yearMonth: string;
  } | null;
}

interface AccountTabProps {
  onClose?: () => void;
}

/**
 * Account tab. Preserves all behaviors from the legacy AccountPanel:
 * - Edit display name (PUT /api/user/profile)
 * - Manage billing via LemonSqueezy portal (GET /api/user/billing-portal)
 * - Theme switcher (light/dark/system)
 * - Legal links
 *
 * Re-organised into the design's Section + FieldRow shape.
 */
export function AccountTab({ onClose: _onClose }: AccountTabProps) {
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [tierStatus, setTierStatus] = React.useState<TierStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = (await res.json()) as UserProfile;
        setProfile(data);
        setNameDraft(data.name ?? "");
      } else {
        setError("Failed to load profile");
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTierStatus = React.useCallback(async () => {
    try {
      const res = await fetch("/api/user/onboarding-status");
      if (res.ok) {
        const data = (await res.json()) as TierStatus;
        setTierStatus(data);
      }
    } catch {
      // non-fatal — tier panel just won't render
    }
  }, []);

  React.useEffect(() => {
    fetchProfile();
    fetchTierStatus();
  }, [fetchProfile, fetchTierStatus]);

  async function saveName() {
    if (!nameDraft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      if (res.ok) {
        await fetchProfile();
        setEditingName(false);
      } else {
        setError("Failed to update name");
      }
    } catch {
      setError("Failed to update name");
    } finally {
      setSaving(false);
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/billing-portal");
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          window.open(data.url, "_blank");
          return;
        }
      }
      setError("Unable to open billing portal — please try again.");
    } catch {
      setError("Unable to open billing portal — please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return <AccountSkeleton />;
  }

  if (!profile) {
    return (
      <p className="py-8 text-center text-[13px] text-muted-foreground">
        Couldn’t load your profile.
      </p>
    );
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="pt-6 pb-12">
      <header className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
          {profile.name || profile.email}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {profile.email} · Member since {memberSince}
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      )}

      <Section title="Identity">
        <FieldRow
          label="Name"
          value={
            editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") {
                      setEditingName(false);
                      setNameDraft(profile.name ?? "");
                    }
                  }}
                  autoFocus
                  className="h-8 text-[13px]"
                />
              </div>
            ) : (
              profile.name || (
                <span className="text-muted-foreground">No name set</span>
              )
            )
          }
          action={
            editingName ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingName(false);
                    setNameDraft(profile.name ?? "");
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveName}
                  disabled={saving || !nameDraft.trim()}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingName(true)}
              >
                Edit
              </Button>
            )
          }
        />
        <FieldRow
          label="Email"
          value={profile.email}
          action={<Badge variant="secondary">Verified</Badge>}
        />
        <FieldRow label="Member since" value={memberSince} last />
      </Section>

      <Section
        title="Plan"
        action={
          profile.teamMembership ? null : profile.subscription ? (
            <Button
              size="sm"
              variant="outline"
              onClick={openBillingPortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <ExternalLink className="mr-1 size-3" />
              )}
              Manage billing
            </Button>
          ) : (
            <Link href="/pricing">
              <Button size="sm">
                Upgrade to Pro
              </Button>
            </Link>
          )
        }
      >
        {profile.teamMembership ? (
          <FieldRow
            label="Managed by"
            value={
              <>
                <span className="font-medium text-foreground">
                  {profile.teamMembership.adminName}
                </span>
                <span className="ml-1 text-muted-foreground">
                  · {profile.teamMembership.teamName}
                </span>
              </>
            }
            last
          />
        ) : profile.subscription ? (
          <>
            <FieldRow
              label="Status"
              value={
                <Badge variant="secondary" className="gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      profile.subscription.status === "active"
                        ? "bg-primary"
                        : "bg-destructive",
                    )}
                  />
                  {profile.subscription.status === "active"
                    ? profile.subscription.cancelAtPeriodEnd
                      ? "Cancelling"
                      : "Active"
                    : profile.subscription.status
                        .charAt(0)
                        .toUpperCase() +
                      profile.subscription.status.slice(1)}
                </Badge>
              }
            />
            <FieldRow
              label="Plan"
              value={
                <span className="capitalize">{profile.subscription.plan}</span>
              }
            />
            <FieldRow
              label={
                profile.subscription.cancelAtPeriodEnd ? "Access until" : "Renews"
              }
              value={new Date(
                profile.subscription.currentPeriodEnd,
              ).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              last
            />
          </>
        ) : (
          <>
            <FieldRow
              label="Plan"
              value={
                <Badge variant="secondary" className="gap-1.5">
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                  Free
                </Badge>
              }
            />
            <FieldRow
              label="Connected sources"
              value={
                tierStatus ? (
                  <span className="font-mono text-foreground">
                    {tierStatus.sourceCount} / {tierStatus.sourceLimit}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
            <FieldRow
              label="AI messages this month"
              value={
                tierStatus?.messageUsage ? (
                  <span className="font-mono text-foreground">
                    {tierStatus.messageUsage.used} / {tierStatus.messageUsage.limit}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
            <FieldRow
              label="Resets"
              value={
                tierStatus?.messageUsage ? (
                  <span className="text-muted-foreground">
                    {new Date(tierStatus.messageUsage.resetsAt).toLocaleDateString(
                      undefined,
                      { month: "long", day: "numeric" },
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">1st of next month</span>
                )
              }
              last
            />
          </>
        )}
      </Section>

      <Section title="Appearance">
        <FieldRow
          label="Theme"
          value={
            <span className="capitalize text-muted-foreground">
              {theme === "system" ? "Match system" : theme}
            </span>
          }
          action={
            <div className="inline-flex rounded-md border border-border bg-muted p-[3px]">
              {(["light", "dark", "system"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "h-[24px] rounded-sm px-2.5 text-[12px] font-medium capitalize transition-colors",
                    theme === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          }
          last
        />
      </Section>

      <Section title="Legal">
        <LinkRow href="/terms">Terms and conditions</LinkRow>
        <LinkRow href="/privacy" last>
          Privacy policy
        </LinkRow>
      </Section>
    </div>
  );
}

function LinkRow({
  href,
  children,
  last,
}: {
  href: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid grid-cols-[180px_1fr_auto] items-center gap-4 py-3.5 transition-colors hover:bg-accent/40",
        !last && "border-b border-border",
        "-mx-5 px-5",
      )}
    >
      <span className="text-[12.5px] text-muted-foreground">Document</span>
      <span className="text-[13px] text-foreground">{children}</span>
      <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function AccountSkeleton() {
  return (
    <div className="space-y-6 pt-6">
      <Skeleton className="h-7 w-[260px]" />
      <Skeleton className="h-4 w-[180px]" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-5 w-[80px]" />
        <Skeleton className="h-[180px] w-full rounded-lg" />
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton className="h-5 w-[80px]" />
        <Skeleton className="h-[140px] w-full rounded-lg" />
      </div>
    </div>
  );
}
