"use client";

// Repurposed: scheduled reports are now the same system as email alerts.
// This page is kept as a thin overview so existing inbound links continue to work.

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { Reveal } from "@/components/marketing/system/Reveal";
import Link from "next/link";
import { FileText, Clock, Send } from "lucide-react";

export default function AutomatedReportsPage() {
  return (
    <FeaturePageLayout
      eyebrow="Scheduled reports"
      title="Reports that write themselves."
      subtitle="Scheduled email alerts are how reports work in Meaning. Write a prompt, pick a cadence, and Meaning runs it for you — with an AI summary, chart, and recommendations."
    >
      <MarketingSection center maxWidth="5xl">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="Prompt-driven"
              description="Describe the report in plain English. No templates to configure."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Any cadence"
              description="Weekly, bi-weekly, or monthly. Pick the day and time."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<Send className="h-6 w-6" />}
              title="Multi-recipient"
              description="Send to any combination of teammates and external addresses."
            />
          </Reveal>
        </div>
        <p className="mt-10 text-center text-sm" style={{ color: "var(--m-text-muted)" }}>
          See the full feature →{" "}
          <Link href="/features/email-alerts" style={{ color: "var(--brand)" }} className="underline-offset-4 hover:underline">
            Email alerts
          </Link>
        </p>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
