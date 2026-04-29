"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DisplayHeading } from "@/components/marketing/system/DisplayHeading";
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

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/signup";
    }
  }, [status]);

  // Load Lemon.js for checkout overlay
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
    window.location.href = "/";
  }

  async function handleProCta() {
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

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--m-bg)]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-current"
          style={{ color: "var(--m-text)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div
      className="marketing relative flex min-h-screen flex-col px-4 py-12 md:py-20"
      style={{ background: "var(--m-bg)" }}
    >
      <DottedGrid />

      {/* Back link */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 text-sm text-[color:var(--m-text-muted)] transition-colors hover:text-[color:var(--m-text)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Home
      </Link>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center">
        {/* Header */}
        <div className="mb-12 text-center">
          <div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "var(--m-bg-elevated, rgba(255,255,255,0.06))",
              border: "1px solid var(--m-hairline)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 436 436"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: "var(--m-text)" }}
            >
              <path d="M352.65 128.054L234.755 58.7598C225.248 53.1732 213.469 53.0716 203.872 58.516L84.8758 125.941C75.2785 131.376 69.308 141.523 69.2171 152.554L68.1261 289.273C68.0351 300.304 73.844 310.543 83.3503 316.14L201.255 385.454C210.772 391.041 222.541 391.143 232.138 385.698L351.134 318.273C360.732 312.839 366.702 302.691 366.793 291.66L367.874 154.931C367.965 143.9 362.156 133.661 352.65 128.074V128.054ZM362.611 187.303L338.82 308.816C336.9 318.618 329.899 326.653 320.443 329.893L203.276 370.046C193.82 373.286 183.364 371.234 175.828 364.672L82.4512 283.311C74.9149 276.749 71.4598 266.663 73.3793 256.861L97.1805 135.357C99.1 125.555 106.101 117.521 115.557 114.281L232.724 74.128C242.18 70.8878 252.636 72.9396 260.172 79.5013L353.539 160.842C361.075 167.404 364.53 177.49 362.611 187.292V187.303Z" />
              <path d="M340.65 191.158L274.712 109.055C269.388 102.433 260.942 99.1519 252.547 100.442L148.442 116.481C140.047 117.771 132.975 123.449 129.894 131.361L91.7273 229.493C88.646 237.405 90.0301 246.364 95.354 252.987L161.302 335.1C166.626 341.722 175.072 345.013 183.467 343.713L287.572 327.685C295.967 326.395 303.039 320.717 306.12 312.804L344.277 214.652C347.358 206.74 345.974 197.771 340.65 191.158ZM324.769 244.404L270.843 317.477C266.488 323.368 259.326 326.496 252.042 325.674L161.777 315.526C154.493 314.704 148.2 310.072 145.27 303.358L108.932 220.127C106.002 213.413 106.871 205.643 111.225 199.751L165.151 126.689C169.506 120.797 176.668 117.669 183.952 118.492L274.217 128.649C281.501 129.472 287.784 134.104 290.724 140.818L327.062 224.028C329.992 230.742 329.123 238.512 324.769 244.404Z" />
            </svg>
          </div>
          <DisplayHeading size="lg" as="h1" className="mb-2">
            {firstName ? `Welcome, ${firstName}` : "Pick a plan"}
          </DisplayHeading>
          <p className="text-base text-[color:var(--m-text-secondary)]">
            Choose how you want to start.
          </p>
        </div>

        {/* Two-card grid */}
        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">

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
                  Continue on Free
                </Button>
                <p className="mt-3 text-center text-xs text-[color:var(--m-text-muted)]">
                  Upgrade anytime.
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
                  {loading ? "Opening checkout..." : "Subscribe to Pro"}
                </Button>
                <p className="mt-3 text-center text-xs text-[color:var(--m-text-muted)]">
                  Cancel anytime.
                </p>
              </div>
            </div>
          </div>

        </div>

        <p className="mt-8 text-center text-xs text-[color:var(--m-text-muted)]">
          Launch offer expires 19 July 2026
        </p>
      </div>
    </div>
  );
}
