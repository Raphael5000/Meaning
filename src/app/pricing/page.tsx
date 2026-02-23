"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";

export default function PricingPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      // Embedded checkout: overlay on same page, session stays intact
      try {
        const PaystackPop = (await import("@paystack/inline-js")).default;
        const paystack = new PaystackPop();
        paystack.resumeTransaction(data.access_code, {
          onSuccess: async () => {
            // Sync subscription before redirect (webhook may be delayed)
            await fetch("/api/payments/verify-complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference: data.reference }),
            });
            setLoading(false);
            // Paystack overlay may be a popup; redirect parent (has session) and close
            if (window.opener) {
              window.opener.location.href = "/connect-analytics?payment=success";
              window.close();
            } else {
              window.location.href = "/connect-analytics?payment=success";
            }
          },
          onCancel: () => setLoading(false),
          onError: (err: { message: string }) => {
            setError(err?.message || "Payment failed");
            setLoading(false);
          },
        });
      } catch {
        // Embedded failed (e.g. script load) — fall back to redirect
        window.location.href = data.authorization_url;
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
            Simple pricing
          </div>

          <h1
            className="mb-4 text-4xl font-bold md:text-5xl"
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
          <div
            className="relative mx-auto max-w-sm overflow-hidden rounded-2xl p-8 text-left"
            style={{
              background:
                "var(--card-bg)",
              border: "1px solid rgba(16, 163, 127, 0.4)",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.45), 0 0 25px rgba(16, 163, 127, 0.12)",
            }}
          >
            <div className="card-noise" aria-hidden />
            <div className="relative z-10">
              <p
                className="mb-1 text-sm font-medium"
                style={{ color: "var(--accent)" }}
              >
                Monthly
              </p>
              <div className="mb-6 flex items-baseline gap-1">
                <span
                  className="text-4xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  R299
                </span>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  /month
                </span>
              </div>

              <ul className="mb-8 flex flex-col gap-3">
                {[
                  "Unlimited AI-powered queries",
                  "All GA4 properties",
                  "Real-time analytics",
                  "AI recommendations",
                  "Chat history",
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

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full cursor-pointer rounded-[100px] px-6 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
                  color: "white",
                  boxShadow: "0 0 20px rgba(16, 163, 127, 0.3)",
                }}
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
                Cancel anytime. Powered by Paystack.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
