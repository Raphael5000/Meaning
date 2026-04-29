"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
import { Reveal } from "@/components/marketing/system/Reveal";
import { DottedGrid } from "@/components/marketing/system/Backgrounds";

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url: { Open: (url: string) => void };
    };
  }
}

const FREE_FEATURES = [
  "2 connected data sources",
  "20 AI chat messages per month",
  "Drag-and-drop dashboards with 14 chart types",
  "Scheduled email alerts with AI summaries",
  "Multi-currency support",
];

const PRO_FEATURES = [
  "Unlimited data source connections",
  "Unlimited AI chat across every source",
  "All 6 connectors — GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console",
  "Drag-and-drop dashboards with 14 chart types",
  "Scheduled email alerts with AI summaries",
  "Unlimited team members and properties",
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load Lemon.js script for checkout overlay (used when authenticated users
  // upgrade directly from the pricing page).
  useEffect(() => {
    if (document.getElementById("lemonsqueezy-js")) return;
    const script = document.createElement("script");
    script.id = "lemonsqueezy-js";
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.defer = true;
    script.onload = () => window.createLemonSqueezy?.();
    document.head.appendChild(script);
  }, []);

  function handleFreeCta() {
    // Logged-in users skip signup and go to dashboard.
    window.location.href = session ? "/" : "/signup?plan=free";
  }

  async function handleProCta() {
    if (!session) {
      window.location.href = "/signup?plan=pro";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start payment");
        setLoading(false);
        return;
      }

      if (window.LemonSqueezy) {
        window.LemonSqueezy.Url.Open(data.checkout_url);
        setLoading(false);
      } else {
        window.location.href = data.checkout_url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="marketing relative min-h-screen"
      style={{ background: "var(--m-bg)" }}
    >
      <DottedGrid />

      <Navbar />

      {/* Pricing content */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-32 pb-24 md:pt-40 text-center">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <span className="launch-pill mb-6">
              <span className="launch-pill-star">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </span>
              Launch Offer
            </span>

            <DisplayHeading size="xl" as="h1" className="mb-12">
              Pricing
            </DisplayHeading>
          </Reveal>

          {/* Two-card grid */}
          <Reveal delay={0.08}>
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">

              {/* FREE card */}
              <div
                className="liquid-glass spotlight spotlight-white relative overflow-hidden rounded-2xl p-8 text-left"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
              >
                <span className="liquid-glass-shimmer" aria-hidden />
                <div className="relative z-10 flex h-full flex-col">
                  <p className="mb-1 text-sm font-medium text-[color:var(--m-text-secondary)]">
                    Free
                  </p>
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[color:var(--m-text)]">
                      $0
                    </span>
                    <span className="text-sm text-[color:var(--m-text-muted)]">
                      /forever
                    </span>
                  </div>
                  <p className="mb-6 text-sm text-[color:var(--m-text-muted)]">
                    Get started, no credit card required
                  </p>

                  <ul className="mb-8 flex flex-col gap-3">
                    {FREE_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 text-[color:var(--m-text-secondary)]"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-sm text-[color:var(--m-text-secondary)]">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    <Button
                      onClick={handleFreeCta}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      Get started free
                    </Button>
                    <p className="mt-3 text-center text-xs text-[color:var(--m-text-muted)]">
                      No credit card. Upgrade anytime.
                    </p>
                  </div>
                </div>
              </div>

              {/* PRO card */}
              <div
                className="liquid-glass spotlight spotlight-white relative overflow-hidden rounded-2xl p-8 text-left"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
              >
                <span className="liquid-glass-shimmer" aria-hidden />

                <div className="relative z-10 flex h-full flex-col">
                  {/* Plan name + Most popular pill on one row */}
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[color:var(--brand)]">
                      Pro
                    </p>
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: "var(--brand-soft)",
                        color: "var(--brand)",
                      }}
                    >
                      Most popular
                    </span>
                  </div>

                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[color:var(--m-text)]">
                      $9.99
                    </span>
                    <span className="text-sm text-[color:var(--m-text-muted)]">
                      /mo
                    </span>
                  </div>
                  <p className="mb-6 text-sm text-[color:var(--m-text-muted)]">
                    Launch price locked in forever — everything in Free, plus
                    unlimited usage
                  </p>

                  <ul className="mb-8 flex flex-col gap-3">
                    {PRO_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 text-[color:var(--brand)]"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-sm text-[color:var(--m-text-secondary)]">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {error && (
                    <p className="mb-4 text-sm" style={{ color: "var(--error)" }}>
                      {error}
                    </p>
                  )}

                  <div className="mt-auto">
                    <Button
                      onClick={handleProCta}
                      disabled={loading}
                      size="lg"
                      className="w-full"
                    >
                      {loading
                        ? "Opening checkout..."
                        : session
                          ? "Upgrade to Pro"
                          : "Start Pro"}
                    </Button>
                    <p className="mt-3 text-center text-xs text-[color:var(--m-text-muted)]">
                      Cancel anytime.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </Reveal>

          <p className="mt-8 text-sm text-[color:var(--m-text-muted)]">
            Launch offer expires 19 July 2026. Subscribe before then to lock in
            the Pro price forever.
          </p>
          <p className="mt-2 text-xs text-[color:var(--m-text-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-2">
              Log in
            </Link>
            .
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
