"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarketingCta } from "@/components/marketing/MarketingCta";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { MonoLabel, GlowPill } from "@/components/marketing/system/MonoLabel";
import { Reveal } from "@/components/marketing/system/Reveal";
import { DottedGrid } from "@/components/marketing/system/Backgrounds";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import {
  ComparisonTable,
  type ComparisonSectionData,
} from "@/components/marketing/ComparisonTable";
import { Check } from "lucide-react";
import type { MouseEvent } from "react";

export type ComparisonPageData = {
  competitor: {
    name: string;
    tagline: string;
  };
  hero: {
    title: string;
    subtitle: string;
    updated: string;
  };
  tldr: {
    competitor: { heading: string; description: string; points: string[] };
    meaning: { heading: string; description: string; points: string[] };
  };
  featureSections: ComparisonSectionData[];
  pricing: {
    competitor: { headline: string; details: string[] };
    meaning: { headline: string; details: string[] };
  };
  whenToChoose: {
    competitor: { title: string; bullets: string[] };
    meaning: { title: string; bullets: string[] };
  };
  useCases: { title: string; description: string }[];
  migration?: { title: string; steps: string[] };
  faqs: { question: string; answer: string }[];
};

function spotlightMove(e: MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

function TldrCard({
  heading,
  description,
  points,
  highlight = false,
}: {
  heading: string;
  description: string;
  points: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative h-full overflow-hidden rounded-2xl p-6 ${
        highlight ? "liquid-glass spotlight" : ""
      }`}
      style={
        highlight
          ? undefined
          : {
              background: "var(--m-surface)",
              border: "0.5px solid var(--m-hairline)",
            }
      }
      onMouseMove={highlight ? spotlightMove : undefined}
    >
      {highlight && <span className="liquid-glass-shimmer" aria-hidden />}
      <div className="relative z-10">
        <h3
          className="mb-2 text-lg font-semibold"
          style={{ color: highlight ? "var(--brand)" : "var(--m-text)" }}
        >
          {heading}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-[color:var(--m-text-secondary)]">
          {description}
        </p>
        <ul className="flex flex-col gap-2">
          {points.map((p) => (
            <li
              key={p}
              className="flex items-start gap-2 text-sm text-[color:var(--m-text-secondary)]"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand)]" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function WhenToChooseCard({
  title,
  bullets,
  highlight = false,
}: {
  title: string;
  bullets: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`h-full rounded-2xl p-6 ${highlight ? "liquid-glass" : ""}`}
      style={
        highlight
          ? undefined
          : {
              background: "var(--m-surface)",
              border: "0.5px solid var(--m-hairline)",
            }
      }
    >
      <h3
        className="mb-4 text-base font-semibold"
        style={{ color: highlight ? "var(--brand)" : "var(--m-text)" }}
      >
        {title}
      </h3>
      <ul className="flex flex-col gap-3">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-sm text-[color:var(--m-text-secondary)]"
          >
            <Check
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{
                color: highlight ? "var(--brand)" : "var(--m-text-muted)",
              }}
            />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComparisonPageLayout({ data }: { data: ComparisonPageData }) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <div
      className="marketing relative min-h-screen overflow-x-clip"
      style={{ background: "var(--m-bg)" }}
    >
      {/* JSON-LD FAQ schema */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <DottedGrid />

      <Navbar />

      {/* Hero */}
      <section className="relative z-10 px-6 pb-16 pt-32 md:px-12 md:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <GlowPill className="mb-6">
              Comparison &middot; {data.hero.updated}
            </GlowPill>
            <DisplayHeading size="2xl" as="h1" className="mb-6">
              {data.hero.title}
            </DisplayHeading>
            <p className="mx-auto max-w-2xl text-lg text-[color:var(--m-text-secondary)] md:text-xl" style={{ lineHeight: "1.7" }}>
              {data.hero.subtitle}
            </p>
          </Reveal>
        </div>
      </section>

      {/* TL;DR */}
      <MarketingSection
        center
        maxWidth="5xl"
        heading="At a glance"
        subhead={`How Meaning and ${data.competitor.name} compare in one screen.`}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <TldrCard
              heading={data.tldr.competitor.heading}
              description={data.tldr.competitor.description}
              points={data.tldr.competitor.points}
            />
          </Reveal>
          <Reveal delay={0.06}>
            <TldrCard
              heading={data.tldr.meaning.heading}
              description={data.tldr.meaning.description}
              points={data.tldr.meaning.points}
              highlight
            />
          </Reveal>
        </div>
      </MarketingSection>

      {/* Feature comparison table */}
      <MarketingSection
        center
        maxWidth="5xl"
        heading="Feature-by-feature"
        subhead="Everything that matters for marketing analytics teams, side by side."
      >
        <Reveal>
          <ComparisonTable
            sections={data.featureSections}
            competitorName={data.competitor.name}
          />
        </Reveal>
      </MarketingSection>

      {/* Pricing */}
      <MarketingSection
        center
        maxWidth="5xl"
        heading="Pricing"
        subhead="What you actually pay, and what you get for it."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div
              className="h-full rounded-2xl p-6"
              style={{
                background: "var(--m-surface)",
                border: "0.5px solid var(--m-hairline)",
              }}
            >
              <p className="mono-label mb-1">{data.competitor.name}</p>
              <p className="mb-4 text-2xl font-semibold text-[color:var(--m-text)]">
                {data.pricing.competitor.headline}
              </p>
              <ul className="flex flex-col gap-2">
                {data.pricing.competitor.details.map((d) => (
                  <li
                    key={d}
                    className="flex items-start gap-2 text-sm text-[color:var(--m-text-secondary)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--m-text-muted)]" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="liquid-glass relative h-full overflow-hidden rounded-2xl p-6">
              <span className="liquid-glass-shimmer" aria-hidden />
              <div className="relative z-10">
                <p className="mono-label mb-1 text-[color:var(--brand)]">Meaning</p>
                <p className="mb-4 text-2xl font-semibold text-[color:var(--m-text)]">
                  {data.pricing.meaning.headline}
                </p>
                <ul className="flex flex-col gap-2">
                  {data.pricing.meaning.details.map((d) => (
                    <li
                      key={d}
                      className="flex items-start gap-2 text-sm text-[color:var(--m-text-secondary)]"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand)]"
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </MarketingSection>

      {/* When to choose each */}
      <MarketingSection
        center
        maxWidth="5xl"
        heading="When to choose each"
        subhead="The honest recommendation — because not every team should pick Meaning."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <WhenToChooseCard
              title={data.whenToChoose.competitor.title}
              bullets={data.whenToChoose.competitor.bullets}
            />
          </Reveal>
          <Reveal delay={0.06}>
            <WhenToChooseCard
              title={data.whenToChoose.meaning.title}
              bullets={data.whenToChoose.meaning.bullets}
              highlight
            />
          </Reveal>
        </div>
      </MarketingSection>

      {/* Use cases */}
      <MarketingSection
        center
        maxWidth="6xl"
        heading="Where Meaning stands out"
        subhead={`Real jobs teams hire Meaning for that ${data.competitor.name} isn't built to handle.`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.useCases.map((u, i) => (
            <Reveal key={u.title} delay={i * 0.04}>
              <div
                className="liquid-glass spotlight relative h-full overflow-hidden rounded-2xl p-5"
                onMouseMove={spotlightMove}
              >
                <div className="relative z-10">
                  <h4 className="mb-2 text-sm font-semibold text-[color:var(--m-text)]">
                    {u.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-[color:var(--m-text-secondary)]">
                    {u.description}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </MarketingSection>

      {/* Migration */}
      {data.migration && (
        <MarketingSection
          center
          maxWidth="4xl"
          heading={data.migration.title}
          subhead="Most teams are up and running in under an hour."
        >
          <div className="flex flex-col gap-3">
            {data.migration.steps.map((step, i) => (
              <Reveal key={step} delay={i * 0.04}>
                <div
                  className="liquid-glass relative flex items-start gap-4 overflow-hidden rounded-2xl p-5"
                >
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
                  <p className="relative z-10 pt-1 text-sm leading-relaxed text-[color:var(--m-text)]">
                    {step}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </MarketingSection>
      )}

      {/* Related features */}
      <MarketingSection center maxWidth="4xl">
        <MonoLabel className="mb-6 block text-center">Dig deeper</MonoLabel>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { label: "Chat", href: "/features/natural-language" },
            { label: "Dashboards", href: "/features/dashboards" },
            { label: "Connectors", href: "/features/connectors" },
            { label: "Alerts", href: "/features/email-alerts" },
            { label: "AI Insights", href: "/features/ai-insights" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="btn-display btn-display-ghost"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </MarketingSection>

      {/* FAQ */}
      <section className="relative z-10 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <DisplayHeading size="lg" className="mb-10 text-center">
              Questions
            </DisplayHeading>
          </Reveal>
          <FaqAccordion faqs={data.faqs} />
        </div>
      </section>

      <Reveal>
        <MarketingCta
          heading="Ready to try Meaning?"
          subtitle="Get started free. Connect your first data source in under a minute."
        />
      </Reveal>

      <Footer />
    </div>
  );
}
