import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarketingCta } from "@/components/marketing/MarketingCta";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { GlowPill } from "@/components/marketing/system/MonoLabel";
import { Reveal } from "@/components/marketing/system/Reveal";
import { DottedGrid } from "@/components/marketing/system/Backgrounds";
import { JsonLd } from "@/components/JsonLd";
import {
  Users,
  Bell,
  LayoutGrid,
  MessageSquare,
  DollarSign,
  Shield,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Agency Reporting Tool — AI-Powered Client Reports",
  description:
    "The agency reporting tool that writes itself. Connect each client's GA4, Google Ads, LinkedIn, and more — then send AI-powered reports on any schedule. Client reporting software built for modern agencies.",
  keywords: [
    "agency reporting tool",
    "client reporting software",
    "marketing agency reporting",
  ],
  alternates: { canonical: "/agency-reporting" },
};

const AGENCY_FEATURES = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "Multi-client orgs",
    description:
      "Create a separate org for each client with its own data sources, dashboards, and team members.",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Scheduled client reports",
    description:
      "Write a prompt, pick a cadence, and send AI-powered reports to clients with summaries and next steps.",
  },
  {
    icon: <LayoutGrid className="h-6 w-6" />,
    title: "Client dashboards",
    description:
      "Build dashboards in plain English and share them with client team members — no design skills required.",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Ad-hoc client questions",
    description:
      "When a client asks 'why did traffic drop?', answer in seconds from chat instead of building a new report.",
  },
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: "Predictable pricing",
    description:
      "Flat $9.99/seat — no per-client fees, no per-source upsells. Add clients without repricing your stack.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Roles and permissions",
    description:
      "Control who sees what. Assign admin, editor, or viewer roles to keep client data isolated.",
  },
];

export default function AgencyReportingPage() {
  return (
    <div
      className="marketing relative min-h-screen overflow-x-clip"
      style={{ background: "var(--m-bg)" }}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Agency Reporting Tool — AI-Powered Client Reports",
          description:
            "Client reporting software for marketing agencies, powered by AI.",
          url: "https://usemeaning.io/agency-reporting",
        }}
      />
      <DottedGrid />
      <Navbar />

      {/* Hero */}
      <section className="relative z-10 px-6 pb-16 pt-32 md:px-12 md:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <GlowPill className="mb-6">Agency Reporting</GlowPill>
            <DisplayHeading size="2xl" as="h1" className="mb-6">
              Agency Reporting Tool — AI-Powered Client Reports
            </DisplayHeading>
            <p
              className="mx-auto max-w-2xl text-lg text-[color:var(--m-text-secondary)] md:text-xl"
              style={{ lineHeight: "1.7" }}
            >
              Stop spending hours building client reports. Meaning is the client
              reporting software that writes reports from a prompt, sends them on
              schedule, and includes AI summaries with every delivery. Connect each
              client&apos;s data sources and let Meaning do the rest.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <MarketingSection center maxWidth="6xl" heading="Built for agencies">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {AGENCY_FEATURES.map((feat, i) => (
            <Reveal key={feat.title} delay={i * 0.04}>
              <FeatureCard
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
              />
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Workflow */}
      <MarketingSection
        center
        maxWidth="4xl"
        heading="How agencies use Meaning"
        subhead="From onboarding a new client to sending their first AI-powered report."
      >
        <div className="flex flex-col gap-3">
          {[
            "Create an org for the client and invite their team",
            "Connect their GA4, Google Ads, LinkedIn, and other data sources",
            "Ask questions in chat to explore their data immediately",
            "Build dashboards by describing the widgets in plain English",
            "Set up scheduled reports that send AI summaries to the client's inbox",
          ].map((step, i) => (
            <Reveal key={step} delay={i * 0.04}>
              <div className="liquid-glass flex items-start gap-4 rounded-2xl p-5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    background: "var(--brand-soft)",
                    color: "var(--brand)",
                    border: "2px solid var(--brand-ring)",
                  }}
                >
                  {i + 1}
                </div>
                <p
                  className="pt-1 text-sm leading-relaxed"
                  style={{ color: "var(--m-text)" }}
                >
                  {step}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Compare */}
      <MarketingSection center maxWidth="4xl" heading="How Meaning compares for agencies">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/compare/whatagraph" className="btn-display btn-display-ghost">
            Meaning vs Whatagraph
          </Link>
          <Link href="/compare/supermetrics" className="btn-display btn-display-ghost">
            Meaning vs Supermetrics
          </Link>
          <Link href="/compare/databox" className="btn-display btn-display-ghost">
            Meaning vs Databox
          </Link>
          <Link href="/features/team-collaboration" className="btn-display btn-display-ghost">
            Team features
          </Link>
        </div>
      </MarketingSection>

      <Reveal>
        <MarketingCta
          heading="Ready to simplify client reporting?"
          subtitle="Get started free. Set up your first client in under 5 minutes."
        />
      </Reveal>

      <Footer />
    </div>
  );
}
