"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
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

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load Lemon.js script for checkout overlay
  useEffect(() => {
    if (document.getElementById("lemonsqueezy-js")) return;
    const script = document.createElement("script");
    script.id = "lemonsqueezy-js";
    script.src = "https://app.lemonsqueezy.com/js/lemon.js";
    script.defer = true;
    script.onload = () => window.createLemonSqueezy?.();
    document.head.appendChild(script);
  }, []);

  async function handleSubscribe() {
    if (!session) {
      window.location.href = "/signup";
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

      // Try overlay first, fall back to redirect
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
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <span className="launch-pill mb-6">
              <span className="launch-pill-star">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </span>
              Launch Offer
            </span>

            <DisplayHeading size="xl" as="h1" className="mb-4">
              One plan, everything included
            </DisplayHeading>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-[color:var(--m-text-secondary)]">
              Connect GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, and
              Search Console — then ask anything in plain English. One plan, no per-connector fees.
            </p>
          </Reveal>

          {/* Pricing card */}
          <Reveal delay={0.08}>
            <div className="mx-auto max-w-md">
              <div
                className="liquid-glass spotlight spotlight-white relative overflow-hidden rounded-2xl p-8 text-left"
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
              >
                <span className="liquid-glass-shimmer" aria-hidden />
                <div className="relative z-10 flex flex-col">

                  {/* Trial banner */}
                  <div
                    className="-mx-8 -mt-8 mb-6 px-8 py-4"
                    style={{
                      background: "linear-gradient(135deg, var(--brand-soft) 0%, rgba(99, 102, 241, 0.08) 100%)",
                      borderBottom: "1px solid var(--m-hairline)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-soft)]"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-[color:var(--brand)]"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--m-text)]">
                          Try free for 14 days
                        </p>
                        <p className="text-xs text-[color:var(--m-text-muted)]">
                          No charge until your trial ends. Cancel anytime.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mb-1 text-sm font-medium text-[color:var(--brand)]">
                    Launch Price — locked in forever
                  </p>
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[color:var(--m-text)]">
                      $9.99
                    </span>
                    <span className="text-sm text-[color:var(--m-text-muted)]">
                      /mo
                    </span>
                  </div>
                  <p className="mb-6 text-sm text-[color:var(--m-text-muted)]">
                    after 14-day free trial · this price won&apos;t increase
                  </p>

                  <ul className="mb-8 flex flex-col gap-3">
                    {[
                      "All connectors — GA4, Google Ads, Microsoft Ads, LinkedIn, Mailchimp, Search Console",
                      "Unlimited AI-powered queries across every source",
                      "Drag-and-drop dashboards with 14 chart types",
                      "Scheduled email alerts with AI summaries",
                      "Unlimited team members and properties",
                      "Multi-currency support with live exchange rates",
                    ].map((feature) => (
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
                    <button
                      onClick={handleSubscribe}
                      disabled={loading}
                      className="btn-display w-full font-semibold"
                    >
                      {loading
                        ? "Opening checkout..."
                        : session
                          ? "Start free trial"
                          : "Get started free"}
                    </button>

                    <p className="mt-3 text-center text-xs text-[color:var(--m-text-muted)]">
                      14-day free trial. Cancel anytime.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </Reveal>

          <p className="mt-8 text-sm text-[color:var(--m-text-muted)]">
            Launch offer expires 19 July 2026. Subscribe before then to lock in this price forever.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
