"use client";

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { Reveal } from "@/components/marketing/system/Reveal";
import { Users, Shield, Key, Mail, CreditCard, Building2, Check, X } from "lucide-react";

function TeamMockLarge() {
  return (
    <div className="liquid-glass shimmer overflow-hidden rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--m-text)" }}>Team members</p>
          <p className="text-[11px]" style={{ color: "var(--m-text-muted)" }}>Acme Marketing</p>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs"
          style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
        >
          4 / 5 seats
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {[
          { name: "Sarah Chen", role: "Admin", scope: "All connectors", email: "sarah@acme.com" },
          { name: "James Wilson", role: "Member", scope: "GA4 · Google Ads", email: "james@acme.com" },
          { name: "Ana Rivera", role: "Member", scope: "LinkedIn · Mailchimp", email: "ana@acme.com" },
          { name: "Liam O'Hara", role: "Member", scope: "Search Console", email: "liam@acme.com" },
        ].map((m) => (
          <div
            key={m.name}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
            >
              {m.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium" style={{ color: "var(--m-text)" }}>
                  {m.name}
                </p>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    background: m.role === "Admin" ? "var(--brand-soft)" : "var(--m-surface)",
                    color: m.role === "Admin" ? "var(--brand)" : "var(--m-text-muted)",
                    border: "1px solid var(--m-hairline)",
                  }}
                >
                  {m.role}
                </span>
              </div>
              <p className="truncate text-xs" style={{ color: "var(--m-text-muted)" }}>{m.scope}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CAPABILITIES = [
  { label: "Chat with connected data", admin: true, member: true },
  { label: "Build and pin dashboards", admin: true, member: true },
  { label: "Create scheduled alerts", admin: true, member: true },
  { label: "Invite members", admin: true, member: false },
  { label: "Assign roles", admin: true, member: false },
  { label: "Connect / disconnect sources", admin: true, member: false },
  { label: "Grant property access", admin: true, member: false },
  { label: "Manage billing and seats", admin: true, member: false },
];

export default function TeamCollaborationPage() {
  return (
    <FeaturePageLayout
      eyebrow="Teams"
      title="Built for teams."
      subtitle="Invite your team, assign roles, and control which connectors and properties each member can access. Billing scales per seat with no surprises."
      heroVisual={<TeamMockLarge />}
      faqs={[
        {
          question: "How does seat billing work?",
          answer:
            "Each active member is a seat at $9.99/month. Admins add or remove members anytime and seats are prorated on your next invoice.",
        },
        {
          question: "What can admins control?",
          answer:
            "Admins manage members, roles, connectors, billing, and which properties each member can see. Members can query and build dashboards within the access they've been granted.",
        },
        {
          question: "Can I have multiple teams?",
          answer:
            "Yes — you can switch between teams inside Meaning, and each team has its own connectors, dashboards, and alerts.",
        },
        {
          question: "How do invitations work?",
          answer:
            "Admins send an email invitation. Recipients click the link, sign in with Google, and are added to the team with the role you chose.",
        },
        {
          question: "What happens if I remove a member?",
          answer:
            "Their access is revoked immediately and the seat is freed. Any dashboards or alerts they created stay with the team.",
        },
        {
          question: "Is there a free plan?",
          answer:
            "Yes. Every team can stay on the free plan forever — 2 connected sources and 20 AI messages per month. Upgrade to Pro for unlimited.",
        },
      ]}
    >
      {/* Roles + capabilities */}
      <MarketingSection center maxWidth="5xl" heading="Two roles, clear boundaries">
        <Reveal>
          <div className="liquid-glass overflow-hidden rounded-2xl">
            <div
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-4"
              style={{ borderBottom: "1px solid var(--m-hairline)", background: "var(--m-surface-elevated)" }}
            >
              <span />
              <span className="w-24 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
                Admin
              </span>
              <span className="w-24 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
                Member
              </span>
            </div>
            {CAPABILITIES.map((c, i) => (
              <div
                key={c.label}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 py-4"
                style={{
                  borderBottom: i === CAPABILITIES.length - 1 ? "none" : "1px solid var(--m-hairline)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--m-text)" }}>{c.label}</span>
                <span className="flex w-24 justify-center">
                  {c.admin ? (
                    <Check className="h-4 w-4" style={{ color: "var(--brand)" }} />
                  ) : (
                    <X className="h-4 w-4" style={{ color: "var(--m-text-muted)" }} />
                  )}
                </span>
                <span className="flex w-24 justify-center">
                  {c.member ? (
                    <Check className="h-4 w-4" style={{ color: "var(--brand)" }} />
                  ) : (
                    <X className="h-4 w-4" style={{ color: "var(--m-text-muted)" }} />
                  )}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </MarketingSection>

      {/* Invitation flow split */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            eyebrow="Invitations"
            heading="Add a teammate in 30 seconds."
            subhead="Type the email, pick a role, and Meaning sends the invite. One click on their side and they're in — with access to exactly the connectors and properties you granted."
            bullets={[
              "Email-based invitations",
              "Pre-assign role and property access",
              "Revoke with a single click",
            ]}
            visual={
              <div className="liquid-glass overflow-hidden rounded-2xl p-6">
                <div className="flex flex-col gap-3">
                  <div
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
                  >
                    <Mail className="h-4 w-4" style={{ color: "var(--m-text-muted)" }} />
                    <span className="text-sm" style={{ color: "var(--m-text)" }}>teammate@acme.com</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{ background: "var(--brand-soft)", border: "1px solid var(--brand-ring)" }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "var(--brand)" }}>Member</p>
                    </div>
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "var(--m-text-muted)" }}>Admin</p>
                    </div>
                  </div>
                  <div
                    className="rounded-xl px-3 py-2 text-center text-xs font-semibold"
                    style={{ background: "var(--brand)", color: "white" }}
                  >
                    Send invite
                  </div>
                </div>
              </div>
            }
          />
        </Reveal>
      </MarketingSection>

      {/* Feature grid */}
      <MarketingSection center maxWidth="5xl" heading="What teams get">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Admin + member roles"
              description="Admins manage the org. Members query, build, and collaborate on dashboards."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<Key className="h-6 w-6" />}
              title="Property-level access"
              description="Grant each member access to specific connectors and properties only."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Org-scoped data"
              description="Connectors, dashboards, and alerts live inside a team — no cross-team leakage."
            />
          </Reveal>
          <Reveal delay={0.18}>
            <FeatureCard
              icon={<CreditCard className="h-6 w-6" />}
              title="Seat-based billing"
              description="$9.99 per active member per month. Prorated when you add or remove seats."
            />
          </Reveal>
          <Reveal delay={0.24}>
            <FeatureCard
              icon={<Building2 className="h-6 w-6" />}
              title="Multiple teams"
              description="Switch between teams if you work across multiple orgs or clients."
            />
          </Reveal>
          <Reveal delay={0.3}>
            <FeatureCard
              icon={<Mail className="h-6 w-6" />}
              title="Shared alerts"
              description="Scheduled email reports are team-owned — anyone can pick them up."
            />
          </Reveal>
        </div>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
