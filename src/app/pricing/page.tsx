"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
            14-day free trial
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
              <div className="relative z-10 flex flex-col">

                {/* Trial banner */}
                <div
                  className="mb-6 -mx-8 -mt-8 px-8 py-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(16, 163, 127, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)",
                    borderBottom: "1px solid rgba(16, 163, 127, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: "rgba(16, 163, 127, 0.15)",
                      }}
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
                        style={{ color: "var(--accent)" }}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Try free for 14 days
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No charge until your trial ends. Cancel anytime.
                      </p>
                    </div>
                  </div>
                </div>

                <p
                  className="mb-1 text-sm font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  Monthly
                </p>
                <div className="mb-1 flex items-baseline gap-1">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    $9.99
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    /mo
                  </span>
                </div>
                <p
                  className="mb-6 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  after 14-day free trial
                </p>

                <ul className="mb-8 flex flex-col gap-3">
                  {[
                    "Unlimited AI-powered queries",
                    "Unlimited GA4 properties",
                    "Unlimited team members",
                    "AI recommendations",
                    "Custom email alerts",
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
                        ? "Start free trial"
                        : "Get started free"}
                  </button>

                  <p
                    className="mt-3 text-center text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No credit card required to start. Cancel anytime.
                  </p>
                </div>
              </div>
            </div>

            {/* Trial timeline */}
            <div
              className="mx-auto mt-6 flex max-w-sm items-center gap-0"
            >
              <div className="flex flex-col items-center">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: "var(--accent)",
                    color: "white",
                  }}
                >
                  1
                </div>
                <p
                  className="mt-2 text-xs font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Today
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Full access
                </p>
              </div>

              <div
                className="mx-1 h-px flex-1"
                style={{ background: "var(--border-color)" }}
              />

              <div className="flex flex-col items-center">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: "rgba(16, 163, 127, 0.15)",
                    color: "var(--accent)",
                  }}
                >
                  7
                </div>
                <p
                  className="mt-2 text-xs font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Day 7
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Reminder
                </p>
              </div>

              <div
                className="mx-1 h-px flex-1"
                style={{ background: "var(--border-color)" }}
              />

              <div className="flex flex-col items-center">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: "rgba(16, 163, 127, 0.08)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  14
                </div>
                <p
                  className="mt-2 text-xs font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Day 14
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  $9.99/mo starts
                </p>
              </div>
            </div>
          </div>

          <p
            className="mt-8 text-sm"
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
