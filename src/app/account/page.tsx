"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useTheme } from "@/components/ThemeProvider";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  subscription: {
    status: string;
    plan: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  teamMembership: {
    role: string;
    teamName: string;
    adminName: string;
  } | null;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  paystackReference: string | null;
  createdAt: string;
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ background: "var(--bg-primary)" }}
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-current"
            style={{ color: "var(--accent)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}

function AccountContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tab, setTab] = useState<"profile" | "subscription" | "billing">(
    "profile"
  );
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentRecord | null>(
    null
  );

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/user/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || "");
    }
  }, []);

  const fetchBilling = useCallback(async () => {
    const res = await fetch("/api/user/billing");
    if (res.ok) {
      const data = await res.json();
      setPayments(data.payments);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.userId) {
      fetchProfile();
      fetchBilling();
    }
  }, [session, fetchProfile, fetchBilling]);

  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      setMessage("Payment successful! Your subscription is now active.");
      setTab("subscription");
    }
  }, [searchParams]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) {
        await fetchProfile();
        setMessage("Profile updated");
      }
    } catch {
      setMessage("Failed to update profile");
    }
    setSaving(false);
  }

  async function handleCancelSubscription() {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period."
      )
    )
      return;

    setCancelling(true);
    try {
      const res = await fetch("/api/user/subscription", { method: "DELETE" });
      if (res.ok) {
        await fetchProfile();
        setMessage("Subscription will cancel at the end of your billing period");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to cancel subscription");
      }
    } catch {
      setMessage("Failed to cancel subscription");
    }
    setCancelling(false);
  }

  if (status === "loading" || !profile) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-current"
          style={{
            color: "var(--accent)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "var(--page-bg)",
      }}
    >
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1
          className="mb-8 text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Account
        </h1>

        {/* Success/error message */}
        {message && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{
              background: "rgba(16, 163, 127, 0.1)",
              border: "1px solid rgba(16, 163, 127, 0.3)",
              color: "var(--accent)",
            }}
          >
            {message}
          </div>
        )}

        {/* Tabs */}
        <div
          className="mb-8 flex gap-1 rounded-lg p-1"
          style={{ background: resolvedTheme === "dark" ? "#0a0a0a" : "#e0e0e0" }}
        >
          {(
            [
              { key: "profile", label: "Profile" },
              { key: "subscription", label: "Subscription" },
              { key: "billing", label: "Billing" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setMessage("");
              }}
              className={`cursor-pointer flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 ${
                tab === key ? "" : "hover:text-[var(--text-secondary)] active:scale-[0.97]"
              }`}
              style={{
                background:
                  tab === key ? "var(--bg-primary)" : "transparent",
                color:
                  tab === key
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                boxShadow:
                  tab === key
                    ? "0 1px 3px rgba(0, 0, 0, 0.08)"
                    : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div className="flex flex-col gap-6">
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background:
                  "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <h2
                  className="mb-6 text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Profile Information
                </h2>

                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                  <div>
                    <label
                      className="mb-1 block text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--border-color)")
                      }
                    />
                  </div>

                  <div>
                    <label
                      className="mb-1 block text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full rounded-lg px-4 py-2.5 text-sm opacity-60"
                      style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-secondary)",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="mb-1 block text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Member since
                    </label>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {new Date(profile.createdAt).toLocaleDateString("en-ZA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary-gradient mt-2 w-fit"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </form>
              </div>
            </div>

            {/* Appearance */}
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background:
                  "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <h2
                  className="mb-2 text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Appearance
                </h2>
                <p
                  className="mb-5 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  Choose how Meaning looks to you. Select a single theme, or sync with your system settings.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        value: "light" as const,
                        label: "Light",
                        icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5" />
                            <line x1="12" y1="1" x2="12" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="23" />
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                            <line x1="1" y1="12" x2="3" y2="12" />
                            <line x1="21" y1="12" x2="23" y2="12" />
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                          </svg>
                        ),
                      },
                      {
                        value: "dark" as const,
                        label: "Dark",
                        icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                        ),
                      },
                      {
                        value: "system" as const,
                        label: "System",
                        icon: (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        ),
                      },
                    ]
                  ).map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl px-4 py-4 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                        theme === value
                          ? ""
                          : "hover:border-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                      }`}
                      style={{
                        background:
                          theme === value
                            ? "rgba(16, 163, 127, 0.12)"
                            : "var(--bg-primary)",
                        border:
                          theme === value
                            ? "1px solid rgba(16, 163, 127, 0.4)"
                            : "1px solid var(--border-color)",
                        color:
                          theme === value
                            ? "var(--accent)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Legal */}
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background:
                  "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <h2
                  className="mb-2 text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Legal
                </h2>
                <p
                  className="mb-5 text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  Review our terms and policies.
                </p>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/terms"
                    className="flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-150 hover:bg-[var(--bg-hover)]"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: "var(--text-muted)", flexShrink: 0 }}
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Terms and Conditions
                      </span>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>

                  <Link
                    href="/privacy"
                    className="flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-150 hover:bg-[var(--bg-hover)]"
                    style={{
                      background: "var(--bg-primary)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: "var(--text-muted)", flexShrink: 0 }}
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Privacy Policy
                      </span>
                    </div>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {tab === "subscription" && (
          <div className="flex flex-col gap-6">
            {/* Subscription status card */}
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background:
                  "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <h2
                  className="mb-6 text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Subscription
                </h2>

                {profile.teamMembership ? (
                  <div className="py-8 text-center">
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Your account is managed by{" "}
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {profile.teamMembership.adminName}
                      </span>
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Team: {profile.teamMembership.teamName}
                    </p>
                  </div>
                ) : profile.subscription ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                        style={{
                          background:
                            profile.subscription.status === "active"
                              ? "rgba(16, 163, 127, 0.15)"
                              : profile.subscription.status === "past_due"
                                ? "rgba(234, 179, 8, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                          color:
                            profile.subscription.status === "active"
                              ? "var(--accent)"
                              : profile.subscription.status === "past_due"
                                ? "#eab308"
                                : "var(--error)",
                        }}
                      >
                        {profile.subscription.status === "active"
                          ? "Active"
                          : profile.subscription.status === "past_due"
                            ? "Past Due"
                            : "Cancelled"}
                      </span>
                      {profile.subscription.cancelAtPeriodEnd && (
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Cancels at period end
                        </span>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Plan
                        </p>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Monthly - R299/month
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Current period
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {new Date(
                            profile.subscription.currentPeriodStart
                          ).toLocaleDateString("en-ZA")}{" "}
                          -{" "}
                          {new Date(
                            profile.subscription.currentPeriodEnd
                          ).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Next billing date
                        </p>
                        <p
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {profile.subscription.cancelAtPeriodEnd
                            ? "No renewal (cancelled)"
                            : new Date(
                                profile.subscription.currentPeriodEnd
                              ).toLocaleDateString("en-ZA", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                        </p>
                      </div>
                    </div>

                    {profile.subscription.status === "active" &&
                      !profile.subscription.cancelAtPeriodEnd && (
                        <button
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          className="btn-outline mt-4 w-fit"
                        >
                          {cancelling
                            ? "Cancelling..."
                            : "Cancel subscription"}
                        </button>
                      )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p
                      className="mb-4 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      You don&apos;t have an active subscription.
                    </p>
                    <Link
                      href="/pricing"
                      className="btn-primary-gradient"
                    >
                      View pricing
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Your plan includes */}
            {profile.subscription && (
              <div
                className="relative overflow-hidden rounded-2xl p-6"
                style={{
                  background:
                    "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div className="card-noise" aria-hidden />
                <div className="relative z-10">
                  <h2
                    className="mb-4 text-lg font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Your plan includes
                  </h2>
                  <ul className="grid gap-3 sm:grid-cols-2">
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
                </div>
              </div>
            )}
          </div>
        )}

        {/* Billing Tab */}
        {tab === "billing" && (
          <div className="flex flex-col gap-6">
            <div
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background:
                  "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="card-noise" aria-hidden />
              <div className="relative z-10">
                <h2
                  className="mb-6 text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {profile.teamMembership ? "Billing" : "Invoices"}
                </h2>

                {profile.teamMembership ? (
                  <div className="py-8 text-center">
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Your account is managed by{" "}
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {profile.teamMembership.adminName}
                      </span>
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Contact your team admin for billing inquiries.
                    </p>
                  </div>
                ) : payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          <th
                            className="pb-3 font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Date
                          </th>
                          <th
                            className="pb-3 font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Description
                          </th>
                          <th
                            className="pb-3 text-right font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Amount
                          </th>
                          <th
                            className="pb-3 text-right font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Status
                          </th>
                          <th
                            className="pb-3 text-right font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((payment) => (
                          <tr
                            key={payment.id}
                            style={{
                              borderBottom: "1px solid var(--border-color)",
                            }}
                          >
                            <td
                              className="py-3"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {new Date(payment.createdAt).toLocaleDateString(
                                "en-ZA"
                              )}
                            </td>
                            <td
                              className="py-3"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {payment.description || "Meaning Monthly"}
                            </td>
                            <td
                              className="py-3 text-right"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {payment.currency === "ZAR"
                                ? "R"
                                : payment.currency}
                              {(payment.amount / 100).toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{
                                  background:
                                    payment.status === "success"
                                      ? "rgba(16, 163, 127, 0.15)"
                                      : payment.status === "pending"
                                        ? "rgba(234, 179, 8, 0.15)"
                                        : "rgba(239, 68, 68, 0.15)",
                                  color:
                                    payment.status === "success"
                                      ? "var(--accent)"
                                      : payment.status === "pending"
                                        ? "#eab308"
                                        : "var(--error)",
                                }}
                              >
                                {payment.status === "success"
                                  ? "Paid"
                                  : payment.status === "pending"
                                    ? "Pending"
                                    : "Failed"}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setSelectedInvoice(payment)}
                                className="cursor-pointer text-xs transition-colors hover:underline"
                                style={{ color: "var(--accent)" }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p
                    className="py-8 text-center text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No invoices yet.
                  </p>
                )}
              </div>
            </div>

            {/* Invoice detail modal */}
            {selectedInvoice && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: "rgba(0, 0, 0, 0.7)" }}
                onClick={() => setSelectedInvoice(null)}
              >
                <div
                  className="relative w-full max-w-md overflow-hidden rounded-2xl p-6"
                  style={{
                    background:
                      "var(--card-bg-solid)",
                    border: "1px solid var(--border-color)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="card-noise" aria-hidden />
                  <div className="relative z-10">
                    <div className="mb-6 flex items-center justify-between">
                      <h3
                        className="text-lg font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        Invoice details
                      </h3>
                      <button
                        onClick={() => setSelectedInvoice(null)}
                        className="cursor-pointer rounded-lg p-1 transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Status
                        </span>
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background:
                              selectedInvoice.status === "success"
                                ? "rgba(16, 163, 127, 0.15)"
                                : selectedInvoice.status === "pending"
                                  ? "rgba(234, 179, 8, 0.15)"
                                  : "rgba(239, 68, 68, 0.15)",
                            color:
                              selectedInvoice.status === "success"
                                ? "var(--accent)"
                                : selectedInvoice.status === "pending"
                                  ? "#eab308"
                                  : "var(--error)",
                          }}
                        >
                          {selectedInvoice.status === "success"
                            ? "Paid"
                            : selectedInvoice.status === "pending"
                              ? "Pending"
                              : "Failed"}
                        </span>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid var(--border-color)",
                          paddingTop: "1rem",
                        }}
                      >
                        <div className="flex justify-between py-1.5">
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Date
                          </span>
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {new Date(
                              selectedInvoice.createdAt
                            ).toLocaleDateString("en-ZA", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-muted)" }}
                          >
                            Description
                          </span>
                          <span
                            className="text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {selectedInvoice.description || "Meaning Monthly"}
                          </span>
                        </div>
                        {selectedInvoice.paystackReference && (
                          <div className="flex justify-between py-1.5">
                            <span
                              className="text-sm"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Reference
                            </span>
                            <span
                              className="font-mono text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {selectedInvoice.paystackReference}
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        className="flex justify-between py-3"
                        style={{
                          borderTop: "1px solid var(--border-color)",
                        }}
                      >
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Total
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {selectedInvoice.currency === "ZAR"
                            ? "R"
                            : selectedInvoice.currency}
                          {(selectedInvoice.amount / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedInvoice(null)}
                      className="btn-outline mt-4 w-full"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
