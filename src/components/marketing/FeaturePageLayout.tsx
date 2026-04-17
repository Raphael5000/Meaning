"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MarketingCta } from "@/components/marketing/MarketingCta";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { GlowPill } from "@/components/marketing/system/MonoLabel";
import { Reveal } from "@/components/marketing/system/Reveal";
import { DottedGrid } from "@/components/marketing/system/Backgrounds";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";

export function FeaturePageLayout({
  eyebrow,
  title,
  subtitle,
  heroVisual,
  children,
  faqs,
  ctaHeading = "Ready to try Meaning?",
  ctaDescription = "Start your 14-day free trial. No credit card required.",
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  heroVisual?: React.ReactNode;
  children?: React.ReactNode;
  faqs?: { question: string; answer: string }[];
  ctaHeading?: string;
  ctaDescription?: string;
}) {
  return (
    <div
      className="marketing relative min-h-screen overflow-x-clip"
      style={{ background: "var(--m-bg)" }}
    >
      <DottedGrid />

      <Navbar />

      {/* Hero */}
      <section className="relative z-10 px-6 pb-16 pt-32 md:px-12 md:pt-40">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <GlowPill className="mb-6">
              {eyebrow}
            </GlowPill>
            <DisplayHeading size="2xl" as="h1" className="mb-6">
              {title}
            </DisplayHeading>
            <p className="mx-auto max-w-2xl text-lg text-[color:var(--m-text-secondary)] md:text-xl" style={{ lineHeight: "1.7" }}>
              {subtitle}
            </p>
          </Reveal>
        </div>
        {heroVisual && (
          <Reveal delay={0.08}>
            <div className="mx-auto mt-12 max-w-4xl">{heroVisual}</div>
          </Reveal>
        )}
      </section>

      {/* Content blocks */}
      <div className="relative z-10">{children}</div>

      {/* FAQ */}
      {faqs && faqs.length > 0 && (
        <section className="relative z-10 px-6 py-24 md:px-12">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <DisplayHeading size="lg" className="mb-10 text-center">
                Questions
              </DisplayHeading>
            </Reveal>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}

      <Reveal>
        <MarketingCta heading={ctaHeading} subtitle={ctaDescription} />
      </Reveal>

      <Footer />
    </div>
  );
}
