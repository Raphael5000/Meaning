"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { FadeInSection } from "@/components/FadeInSection";
import { CtaSection } from "@/components/CtaSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Users,
  Shield,
  UserPlus,
  Building2,
  Key,
  Mail,
} from "lucide-react";

/* ── mock team data ───────────────────────────────────── */
const teamMembers = [
  {
    initials: "MQ",
    name: "Matthew Quarta",
    email: "matt@hivory.io",
    role: "Admin",
    status: "Active",
    color: "#10a37f",
  },
  {
    initials: "JD",
    name: "Jane Doe",
    email: "jane@hivory.io",
    role: "Member",
    status: "Active",
    color: "#6366f1",
  },
  {
    initials: "AK",
    name: "Alex Kim",
    email: "alex@hivory.io",
    role: "Member",
    status: "Active",
    color: "#f59e0b",
  },
  {
    initials: "SP",
    name: "Sarah Patel",
    email: "sarah@hivory.io",
    role: "Member",
    status: "Pending",
    color: "#ec4899",
  },
];

/* ── features grid data ───────────────────────────────── */
const features = [
  {
    icon: Mail,
    title: "Invite via Email",
    description:
      "Send an invite link to any team member with a single click. They sign up, accept, and they're in.",
  },
  {
    icon: Shield,
    title: "Role-based Access",
    description:
      "Assign Admin or Member roles. Admins manage billing and team settings; Members focus on querying data.",
  },
  {
    icon: Building2,
    title: "Property-level Control",
    description:
      "Choose exactly which GA4 properties each team member can access. Keep sensitive data locked down.",
  },
  {
    icon: UserPlus,
    title: "Flexible Seats",
    description:
      "Add or remove seats whenever you need to. Scale your team up for a launch or trim it back down after.",
  },
  {
    icon: Key,
    title: "Per-seat Billing",
    description:
      "R99 per seat per month. Transparent pricing with no hidden fees. You only pay for the seats you use.",
  },
  {
    icon: Users,
    title: "Secure by Default",
    description:
      "Read-only GA4 access for every member. Your data is never stored on our servers.",
  },
];

/* ── invite flow steps ────────────────────────────────── */
const steps = [
  {
    number: "1",
    title: "Enter their email",
    description:
      "Type in your team member's email address from the Team settings page.",
  },
  {
    number: "2",
    title: "Assign role & properties",
    description:
      "Pick their role (Admin or Member) and select which GA4 properties they can query.",
  },
  {
    number: "3",
    title: "They accept & start querying",
    description:
      "Your team member receives an invite email, creates an account, and starts chatting with their data.",
  },
];

/* ═══════════════════════════════════════════════════════ */

export default function TeamCollaborationPage() {
  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--page-bg)" }}
    >
      {/* ── background orbs ──────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
      >
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ top: "5%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/4 h-80 w-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "35%", background: "#6366f1" }}
        />
        <div
          className="absolute left-1/3 h-72 w-72 rounded-full opacity-[0.08] blur-3xl"
          style={{ top: "65%", background: "var(--accent)" }}
        />
      </div>

      <Navbar />

      {/* ═══ 1. HERO ═══════════════════════════════════ */}
      <section className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center md:px-12">
        <FadeInSection>
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
            style={{
              background: "rgba(16, 163, 127, 0.1)",
              border: "1px solid rgba(16, 163, 127, 0.3)",
              color: "var(--accent)",
            }}
          >
            <Users size={14} />
            Work Together
          </div>
        </FadeInSection>

        <FadeInSection delay={100}>
          <h1
            className="mb-4 text-4xl md:text-6xl"
            style={{ color: "var(--text-primary)" }}
          >
            Analytics for the{" "}
            <span style={{ color: "var(--accent)" }}>whole team</span>
          </h1>
        </FadeInSection>

        <FadeInSection delay={200}>
          <p
            className="mx-auto mb-10 max-w-2xl text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Invite team members, assign roles, and control exactly who can
            access which GA4 properties — all from one dashboard.
          </p>
        </FadeInSection>

        <FadeInSection delay={300}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button className="rounded-full px-8 py-3 text-base font-semibold">Get started</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="rounded-full px-8 py-3 text-base font-semibold">
                View pricing
              </Button>
            </Link>
          </div>
        </FadeInSection>
      </section>

      {/* ═══ 2. TEAM OVERVIEW MOCKUP ═══════════════════ */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                {/* header */}
                <div
                  className="flex items-center justify-between border-b px-6 py-4"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <h2
                    className="text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Team Members
                  </h2>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    4 seats used
                  </span>
                </div>

                {/* column labels */}
                <div
                  className="hidden items-center gap-4 border-b px-6 py-3 text-xs font-medium uppercase tracking-wider md:grid"
                  style={{
                    gridTemplateColumns: "1fr 1fr 100px 80px",
                    borderColor: "var(--border-color)",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>Name</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Status</span>
                </div>

                {/* member rows */}
                {teamMembers.map((m) => (
                  <div
                    key={m.email}
                    className="grid items-center gap-4 border-b px-6 py-4 last:border-b-0"
                    style={{
                      gridTemplateColumns: "1fr 1fr 100px 80px",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    {/* name + avatar */}
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: m.color }}
                      >
                        {m.initials}
                      </div>
                      <span
                        className="truncate text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {m.name}
                      </span>
                    </div>

                    {/* email */}
                    <span
                      className="hidden truncate text-sm md:block"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {m.email}
                    </span>

                    {/* role badge */}
                    <span
                      className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        background:
                          m.role === "Admin"
                            ? "rgba(16, 163, 127, 0.1)"
                            : "rgba(99, 102, 241, 0.1)",
                        color:
                          m.role === "Admin" ? "var(--accent)" : "#6366f1",
                        border: `1px solid ${
                          m.role === "Admin"
                            ? "rgba(16, 163, 127, 0.3)"
                            : "rgba(99, 102, 241, 0.3)"
                        }`,
                      }}
                    >
                      {m.role}
                    </span>

                    {/* status */}
                    <span
                      className="text-xs"
                      style={{
                        color:
                          m.status === "Active"
                            ? "var(--accent)"
                            : "var(--text-muted)",
                      }}
                    >
                      {m.status}
                    </span>
                  </div>
                ))}

                {/* invite row */}
                <div
                  className="flex items-center gap-3 px-6 py-4"
                  style={{
                    borderTop: "1px dashed var(--border-color)",
                  }}
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-dashed"
                    style={{
                      borderColor: "var(--border-color)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <UserPlus size={14} />
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--accent)" }}
                  >
                    Invite a new member
                  </span>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══ 3. FEATURES GRID ══════════════════════════ */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Everything your team needs
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                Built-in collaboration tools so everyone on your team can
                get the insights they need.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FadeInSection key={f.title} delay={i * 80} className="h-full">
                <div
                  className="relative h-full overflow-hidden rounded-2xl p-6"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <div
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        color: "var(--accent)",
                      }}
                    >
                      <f.icon size={20} />
                    </div>
                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {f.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {f.description}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. INVITE FLOW (3 steps) ═════════════════ */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <FadeInSection>
            <div className="mb-16 text-center">
              <h2
                className="mb-4 text-3xl md:text-4xl"
                style={{ color: "var(--text-primary)" }}
              >
                Get your team onboard in 3 steps
              </h2>
              <p
                className="mx-auto max-w-2xl text-lg"
                style={{ color: "var(--text-secondary)" }}
              >
                From invite to insight in under two minutes.
              </p>
            </div>
          </FadeInSection>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <FadeInSection key={s.number} delay={i * 120} className="h-full">
                <div
                  className="relative h-full overflow-hidden rounded-2xl p-8 text-center"
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <div
                      className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
                      style={{
                        background: "rgba(16, 163, 127, 0.1)",
                        border: "1px solid rgba(16, 163, 127, 0.3)",
                        color: "var(--accent)",
                      }}
                    >
                      {s.number}
                    </div>
                    <h3
                      className="mb-2 text-lg font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {s.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {s.description}
                    </p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <FadeInSection>
        <CtaSection
          heading="Ready to bring your team together?"
          description="Start with one seat and add your team as you grow. R99 per seat per month, cancel anytime."
          secondaryText="Talk to us"
          secondaryHref="/contact"
        />
      </FadeInSection>

      <Footer />
    </div>
  );
}
