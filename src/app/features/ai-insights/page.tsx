"use client";

import { FeaturePageLayout } from "@/components/marketing/FeaturePageLayout";
import { MarketingSection } from "@/components/marketing/MarketingSection";
import { FeatureSplit } from "@/components/marketing/FeatureSplit";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { Reveal } from "@/components/marketing/system/Reveal";
import { Sparkles, Target, Shield, TrendingUp, Search, Check, AlertTriangle, Brain } from "lucide-react";

function InsightExample({
  title,
  summary,
  steps,
}: {
  title: string;
  summary: React.ReactNode;
  steps: string[];
}) {
  return (
    <div
      className="liquid-glass relative h-full overflow-hidden rounded-2xl p-6"
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--brand)" }}>
        {title}
      </p>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--m-text)" }}>
        {summary}
      </p>
      <div
        className="rounded-xl p-4"
        style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
      >
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
          Recommended next steps
        </p>
        <ul className="flex flex-col gap-2 text-xs" style={{ color: "var(--m-text-secondary)" }}>
          {steps.map((s) => (
            <li key={s}>→ {s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AiInsightsPage() {
  return (
    <FeaturePageLayout
      eyebrow="AI Insights"
      title="Not just answers. Next steps."
      subtitle="Every answer comes with a plain-English summary of what changed, why it matters, and what to try next — grounded in your actual data, never fabricated."
      heroVisual={
        <div
          className="liquid-glass relative overflow-hidden rounded-2xl p-8"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--brand)" }}>
            AI summary
          </p>
          <p className="mb-4 text-base leading-relaxed" style={{ color: "var(--m-text)" }}>
            Paid social CPA dropped <strong>18%</strong> this week, driven mostly by a creative refresh on the
            <strong> &quot;Spring launch&quot; </strong> LinkedIn campaign. Google Ads CPA was flat. Overall blended CPA is
            tracking at <strong>$42.80</strong>, down from <strong>$51.20</strong> last week.
          </p>
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--m-surface-elevated)", border: "1px solid var(--m-hairline)" }}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--m-text-muted)" }}>
              Recommended next steps
            </p>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: "var(--m-text-secondary)" }}>
              <li>→ Shift $2k of budget from Google Display to LinkedIn for the next 7 days.</li>
              <li>→ Test 2 more variants of the winning ad copy.</li>
              <li>→ Review landing page bounce rate — up 6% over the same period.</li>
            </ul>
          </div>
        </div>
      }
      faqs={[
        {
          question: "Are the recommendations grounded in real data?",
          answer:
            "Yes. Every insight is generated directly against query results — no synthetic numbers, no hallucinations. Meaning is built to refuse rather than invent.",
        },
        {
          question: "Can I turn insights off?",
          answer:
            "You can ignore them — answers always include the chart and table too. The AI summary is additive, not a replacement for the raw data.",
        },
        {
          question: "Does the AI remember context across messages?",
          answer:
            "Yes. Insights build on the previous message, so follow-up summaries stay consistent with the thread.",
        },
        {
          question: "Which model generates the insights?",
          answer:
            "Claude, chosen for its accuracy and safety characteristics — both critical when numbers can't be fabricated.",
        },
        {
          question: "Does Meaning detect anomalies automatically?",
          answer:
            "Yes. When a metric deviates meaningfully from its recent trend, Meaning calls it out in the summary and suggests a next step.",
        },
      ]}
    >
      {/* What you get */}
      <MarketingSection center maxWidth="5xl" heading="Three layers of insight, every answer">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Plain-English summary"
              description="A concise explanation of what the data shows, written against the actual query result."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Next-step recommendations"
              description="Concrete actions you can take, informed by the numbers in front of you — not generic advice."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<AlertTriangle className="h-6 w-6" />}
              title="Anomaly detection"
              description="When something moves meaningfully, Meaning flags it and explains the context."
            />
          </Reveal>
        </div>
      </MarketingSection>

      {/* Example gallery */}
      <MarketingSection center maxWidth="6xl" heading="Examples from real questions">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <InsightExample
              title="Paid channel comparison"
              summary={
                <>
                  Google Ads ROAS was <strong>4.2×</strong>, LinkedIn was <strong>2.1×</strong>. Google Ads
                  delivered twice the return per dollar this month.
                </>
              }
              steps={[
                "Shift 15% of LinkedIn budget to Google Ads high-intent keywords.",
                "A/B test two new LinkedIn creatives before scaling back up.",
              ]}
            />
          </Reveal>
          <Reveal delay={0.06}>
            <InsightExample
              title="Funnel drop-off"
              summary={
                <>
                  Mobile checkout drop-off at step 2 jumped from <strong>24%</strong> to <strong>38%</strong> last
                  week — right after the latest deploy.
                </>
              }
              steps={[
                "Roll back the form validation change from last Tuesday.",
                "Add a funnel alert so drop-off &gt; 30% pages you next time.",
              ]}
            />
          </Reveal>
          <Reveal delay={0.12}>
            <InsightExample
              title="SEO opportunity"
              summary={
                <>
                  You have <strong>14 queries</strong> with &gt;5,000 monthly impressions but CTR below{" "}
                  <strong>2%</strong> — mostly listicles ranked positions 4–7.
                </>
              }
              steps={[
                "Rewrite title tags for the top 5 underperforming pages.",
                "Schedule a Search Console CTR alert for ongoing monitoring.",
              ]}
            />
          </Reveal>
          <Reveal delay={0.18}>
            <InsightExample
              title="Email performance"
              summary={
                <>
                  Open rates on the last three campaigns dropped to <strong>18.4%</strong> — previously running
                  at <strong>23%</strong>. Subject line length increased 40% in the same window.
                </>
              }
              steps={[
                "Test shorter subject lines (< 45 characters) next send.",
                "Pull best-performing historical subjects as templates.",
              ]}
            />
          </Reveal>
        </div>
      </MarketingSection>

      {/* Accuracy guardrails */}
      <MarketingSection>
        <Reveal>
          <FeatureSplit
            eyebrow="Accuracy first"
            heading="Meaning refuses to fabricate."
            subhead="LLM-based analytics has an accuracy problem. Meaning solves it by passing the real query result to the model and giving it strict guardrails — if the data isn't there, the answer says so."
            bullets={[
              "Summaries are generated from the actual query result",
              "No invented numbers, ever",
              "Explicit refusals when data isn't available",
              "Every claim is traceable to a row in the result",
            ]}
            visual={
              <div
                className="liquid-glass relative overflow-hidden rounded-2xl p-6"
              >
                <div className="flex flex-col gap-3">
                  {[
                    { icon: <Check className="h-4 w-4" />, text: "Grounded in real rows", ok: true },
                    { icon: <Check className="h-4 w-4" />, text: "Reproducible query", ok: true },
                    { icon: <Check className="h-4 w-4" />, text: "Source-aware definitions", ok: true },
                    { icon: <Check className="h-4 w-4" />, text: "Traceable claims", ok: true },
                    { icon: <Shield className="h-4 w-4" />, text: "No fabrication — ever", ok: true },
                  ].map((c) => (
                    <div
                      key={c.text}
                      className="flex items-center gap-3 rounded-xl px-4 py-3"
                      style={{
                        background: "var(--m-surface-elevated)",
                        border: "1px solid var(--m-hairline)",
                      }}
                    >
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
                      >
                        {c.icon}
                      </span>
                      <span className="text-sm" style={{ color: "var(--m-text)" }}>
                        {c.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </Reveal>
      </MarketingSection>

      {/* How it works */}
      <MarketingSection center maxWidth="5xl" heading="How the model stays honest">
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <FeatureCard
              icon={<Search className="h-6 w-6" />}
              title="Query first"
              description="The SQL runs before the model writes anything — the model only ever sees real numbers."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeatureCard
              icon={<Brain className="h-6 w-6" />}
              title="Strict prompting"
              description="The model is instructed to refuse rather than invent, and to cite the row for every claim."
            />
          </Reveal>
          <Reveal delay={0.12}>
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              title="Delta-aware"
              description="Week-over-week, period-over-period comparisons are computed, not guessed."
            />
          </Reveal>
        </div>
      </MarketingSection>
    </FeaturePageLayout>
  );
}
