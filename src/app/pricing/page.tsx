"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      className="relative min-h-screen"
      style={{
        background:
          "var(--page-bg)",
      }}
    >
      {/* Background orbs */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
      >
        <div
          className="absolute left-1/4 h-96 w-96 rounded-full opacity-[0.12] blur-3xl"
          style={{ top: "10%", background: "var(--accent)" }}
        />
        <div
          className="absolute right-1/4 h-80 w-80 rounded-full opacity-[0.06] blur-3xl"
          style={{ top: "45%", background: "#6366f1" }}
        />
      </div>

      <Navbar />

      {/* Pricing content */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-16 pb-24 text-center">
        <div className="mx-auto max-w-4xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm"
            style={{
              background: "rgba(16, 163, 127, 0.1)",
              border: "1px solid rgba(16, 163, 127, 0.3)",
              color: "var(--accent)",
            }}
          >
            Launch Offer
          </div>

          <h1
            className="mb-4 text-4xl md:text-5xl"
            style={{ color: "var(--text-primary)" }}
          >
            One plan, everything included
          </h1>
          <p
            className="mx-auto mb-12 max-w-2xl text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Get full access to Meaning. Chat with your Google Analytics data,
            get AI-powered insights, and make data-driven decisions.
          </p>

          {/* Pricing card */}
          <div className="mx-auto max-w-md">
            <div
              className="relative overflow-hidden rounded-2xl p-8 text-left"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="card-noise" aria-hidden />
              {/* Why R? pill — top-right corner */}
              <div className="absolute top-4 right-4 z-20">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex cursor-default items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none"
                        style={{
                          background: "rgba(16, 163, 127, 0.1)",
                          border: "1px solid rgba(16, 163, 127, 0.25)",
                          color: "var(--accent)",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                        Why R?
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[220px] text-center text-xs leading-relaxed"
                    >
                      R is South African Rand (ZAR). R99 is roughly $5.50 USD.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative z-10 flex flex-col">
                <p
                  className="mb-1 text-sm font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  Monthly
                </p>
                <div className="mb-2 flex items-baseline gap-1">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    R99
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    /pm
                  </span>
                </div>
                <p
                  className="mb-6 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  per seat &middot; add team members at R99/seat
                </p>

                <ul className="mb-8 flex flex-col gap-3">
                  {[
                    "Unlimited AI-powered queries",
                    "Unlimited GA4 properties",
                    "AI recommendations",
                    "Custom email alerts",
                    "Add team members at R99 per seat",
                    "Priority support",
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
                        style={{ color: "var(--accent)", flexShrink: 0 }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {error && (
                  <p
                    className="mb-4 text-sm"
                    style={{ color: "var(--error)" }}
                  >
                    {error}
                  </p>
                )}

                <div className="mt-auto">
                  <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="btn-primary-gradient w-full font-semibold"
                    style={{ boxShadow: "var(--shadow-button)" }}
                  >
                    {loading
                      ? "Opening checkout..."
                      : session
                        ? "Subscribe now"
                        : "Get started"}
                  </button>

                  <p
                    className="mt-3 text-center text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Cancel anytime. Secure checkout by Lemon Squeezy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p
            className="mt-6 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            Offer valid until 30 April 2026.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
