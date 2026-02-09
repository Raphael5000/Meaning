"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tab, setTab] = useState<"profile" | "subscription" | "billing">(
    "profile"
  );
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");

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
          "linear-gradient(180deg, #050505 0%, #080a09 40%, rgba(16, 163, 127, 0.04) 100%)",
      }}
    >
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/">
          <Image
            src="/Logo.svg"
            alt="Meaning"
            width={120}
            height={42}
            className="w-auto"
            style={{ height: "36px" }}
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Chat
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="cursor-pointer text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Sign out
          </button>
        </div>
      </nav>

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
          style={{ background: "var(--bg-secondary)" }}
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
              className="cursor-pointer flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{
                background:
                  tab === key ? "var(--bg-tertiary)" : "transparent",
                color:
                  tab === key
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <div
            className="relative overflow-hidden rounded-2xl p-6"
            style={{
              background:
                "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.06) 100%)",
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
                  className="mt-2 w-fit cursor-pointer rounded-[100px] px-6 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
                    color: "white",
                  }}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {tab === "subscription" && (
          <div
            className="relative overflow-hidden rounded-2xl p-6"
            style={{
              background:
                "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.06) 100%)",
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

              {profile.subscription ? (
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
                  </div>

                  {profile.subscription.status === "active" &&
                    !profile.subscription.cancelAtPeriodEnd && (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="mt-4 w-fit cursor-pointer rounded-[100px] px-6 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-secondary)",
                        }}
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
                    className="inline-block rounded-[100px] px-6 py-2.5 text-sm font-medium transition-all duration-200"
                    style={{
                      background:
                        "linear-gradient(180deg, #14b58e 0%, #10a37f 45%, #0d8c6d 100%)",
                      color: "white",
                    }}
                  >
                    View pricing
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {tab === "billing" && (
          <div
            className="relative overflow-hidden rounded-2xl p-6"
            style={{
              background:
                "linear-gradient(145deg, rgba(20, 24, 23, 0.98) 0%, rgba(15, 22, 20, 0.99) 45%, rgba(16, 163, 127, 0.06) 100%)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="card-noise" aria-hidden />
            <div className="relative z-10">
              <h2
                className="mb-6 text-lg font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Billing History
              </h2>

              {payments.length > 0 ? (
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
                            {payment.description || "Payment"}
                          </td>
                          <td
                            className="py-3 text-right"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {payment.currency === "ZAR" ? "R" : payment.currency}
                            {(payment.amount / 100).toFixed(2)}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                background:
                                  payment.status === "success"
                                    ? "rgba(16, 163, 127, 0.15)"
                                    : "rgba(239, 68, 68, 0.15)",
                                color:
                                  payment.status === "success"
                                    ? "var(--accent)"
                                    : "var(--error)",
                              }}
                            >
                              {payment.status}
                            </span>
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
                  No billing history yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
